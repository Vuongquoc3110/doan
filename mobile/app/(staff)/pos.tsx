import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  
  Modal,
  Image} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';
import { PosHardwarePanel } from '../../src/components/PosHardwarePanel';

interface PosItem {
  variant_id: number;
  product_name: string;
  variant_label: string;
  price: number;
  qty: number;
}

export default function StaffPosScreen() {
  const [customerPhone, setCustomerPhone] = useState('0900000011');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  const [searchProduct, setSearchProduct] = useState('');
  const [cartItems, setCartItems] = useState<PosItem[]>([]);
  const [usePoints, setUsePoints] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qrModal, setQrModal] = useState<string | null>(null);
  const [createdOrder,setCreatedOrder]=useState<any>(null);
  const saleRequest=useRef({signature:'',key:''});
  const submittingLock=useRef(false);
  const {data:receipt}=useQuery({queryKey:['pos-payment',createdOrder?.orderId],enabled:!!createdOrder?.orderId,queryFn:async()=>(await apiClient.get(`/v1/staff/pos/orders/${createdOrder.orderId}/receipt`)).data.data,refetchInterval:createdOrder?.paymentStatus==='unpaid'?3000:false});
  useEffect(()=>{if(receipt?.payment_status==='paid'&&createdOrder?.paymentStatus==='unpaid'){setCreatedOrder((o:any)=>({...o,paymentStatus:'paid'}));setQrModal(null);}},[receipt?.payment_status]);

  // Fetch products for quick picking
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['pos-products', searchProduct],
    queryFn: async () => {
      const res = await apiClient.get('/v1/products', {
        params: { search: searchProduct.trim() || undefined, limit: 12 },
      });
      return res.data?.data || [];
    },
  });

  const handleLookupCustomer = async () => {
    if (!customerPhone.trim()) return;
    try {
      setSearchingCustomer(true);
      const res = await apiClient.get('/v1/staff/customers/lookup', {
        params: { phone: customerPhone.trim() },
      });
      setCustomerInfo(res.data?.data);
    } catch {
      Alert.alert('Khách hàng mới', 'Số điện thoại chưa có trên hệ thống. Đơn hàng sẽ tích điểm sau khi hoàn tất thanh toán.');
      setCustomerInfo({
        name: 'Khách mua tại quầy',
        phone: customerPhone.trim(),
        tier: 'bronze',
        points: 0,
      });
    } finally {
      setSearchingCustomer(false);
    }
  };

  const addVariant=(variant:any)=>setCartItems(previous=>{
    const existing=previous.find(i=>i.variant_id===variant.variant_id);
    return existing?previous.map(i=>i.variant_id===variant.variant_id?{...i,qty:i.qty+1}:i):[...previous,{variant_id:variant.variant_id,product_name:variant.product_name,variant_label:variant.variant_label,price:Number(variant.price),qty:1}];
  });
  const handleAddProduct = async (prod: any) => {
    if(createdOrder)return;
    try{
      const detail=(await apiClient.get(`/v1/products/${prod.id}`)).data.data;
      const variant=detail.variants?.[0];
      if(!variant)throw new Error('Sản phẩm chưa có quy cách bán');
      addVariant({variant_id:variant.id,product_name:prod.name,variant_label:variant.label,price:variant.price});
    }catch(e:any){Alert.alert('Không thể chọn sản phẩm',e.response?.data?.message||e.message);}
  };

  const handleUpdateQty = (variantId: number, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.variant_id === variantId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as PosItem[];
    setCartItems(updated);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const pointsDiscount = usePoints && customerInfo?.points ? Math.min(Number(customerInfo.points), 50, Math.floor(subtotal / 1000)) * 1000 : 0;
  const finalTotal = Math.max(0, subtotal - pointsDiscount);
  const changeMoney = Number(cashGiven) > finalTotal ? Number(cashGiven) - finalTotal : 0;

  const handleCheckout = async () => {
    if(submittingLock.current||createdOrder)return;
    if(paymentMethod==='cash'&&(!Number.isSafeInteger(Number(cashGiven))||Number(cashGiven)<finalTotal)){Alert.alert('Chưa đủ tiền mặt','Nhập số tiền khách đưa đủ thanh toán hóa đơn.');return;}
    if (cartItems.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn sản phẩm vào hóa đơn');
      return;
    }

    try {
      submittingLock.current=true;
      setSubmitting(true);
      const payload = {
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod: paymentMethod === 'cash' ? 'cod' : paymentMethod,
        pointsToUse: pointsDiscount / 1000,
        cashReceived:paymentMethod==='cash'?Number(cashGiven):undefined,
        items: cartItems.map((i) => ({ variantId: i.variant_id, qty: i.qty })),
      };

      const signature=JSON.stringify(payload);
      if(saleRequest.current.signature!==signature)saleRequest.current={signature,key:'pos-'+Date.now()+'-'+Math.random().toString(36).slice(2)};
      const res = await apiClient.post('/v1/staff/pos/orders', payload,{headers:{'Idempotency-Key':saleRequest.current.key}});
      const order = res.data?.data;
      setCreatedOrder(order);

      if (paymentMethod === 'vietqr' && order?.paymentPayload?.qrUrl) {
        setQrModal(order.paymentPayload.qrUrl);
      } else {
        Alert.alert(
          order.paymentStatus==='paid'?'Đã thu tiền':'Đơn đang chờ thanh toán',
          `Mã đơn POS: ${order.orderCode}. Bạn có thể in hóa đơn ở phần công cụ tại quầy.`,
          [{ text: 'Đóng' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Lỗi POS', err.response?.data?.message || 'Không thể tạo đơn POS');
    } finally {
      submittingLock.current=false;
      setSubmitting(false);
    }
  };

  const handleResetPos = () => {
    setCartItems([]);
    setCustomerInfo(null);
    setCashGiven('');
    setUsePoints(false);
    setQrModal(null);
    setCreatedOrder(null);
    saleRequest.current={signature:'',key:''};
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PosHardwarePanel key={createdOrder?.orderId||'new'} onVariant={addVariant} orderId={createdOrder?.orderId} onNewSale={handleResetPos}/>
      {createdOrder&&<View style={styles.card}><Text accessibilityLiveRegion="polite">{createdOrder.orderCode} · {formatVnd(createdOrder.total)} · {createdOrder.paymentStatus==='paid'?'Đã nhận tiền':'Đang chờ ngân hàng xác nhận'}</Text></View>}
      {/* Customer Lookup Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TÌM KHÁCH HÀNG (TÍCH ĐIỂM SỐ ĐIỆN THOẠI)</Text>
        <View style={styles.lookupRow}>
          <TextInput
            style={styles.lookupInput}
            placeholder="Nhập SĐT khách hàng..."
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={handleLookupCustomer}>
            {searchingCustomer ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.lookupBtnText}>Tra cứu</Text>
            )}
          </TouchableOpacity>
        </View>

        {customerInfo && (
          <View style={styles.customerResultBox}>
            <View>
              <Text style={styles.custName}>
                {customerInfo.fullName || customerInfo.name} ({customerInfo.tier?.toUpperCase() || 'DIAMOND'})
              </Text>
              <Text style={styles.custPhone}>{customerInfo.phone}</Text>
            </View>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>
                {customerInfo.points ? customerInfo.points.toLocaleString('vi-VN') : '50.000'} điểm
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Quick Pick Products */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>CHỌN SẢN PHẨM NHANH</Text>
        <TextInput
          style={styles.searchProdInput}
          placeholder="Tìm sản phẩm theo tên..."
          placeholderTextColor="#9CA3AF"
          value={searchProduct}
          onChangeText={setSearchProduct}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickProdScroll}>
          {products.map((p: any) => (
            <TouchableOpacity
              key={p.id}
              style={styles.prodPill}
              onPress={() => handleAddProduct(p)}
            >
              <Text style={styles.prodPillName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.prodPillPrice}>{formatVnd(p.base_price)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* POS Cart Ticket */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>HÓA ĐƠN BÁN HÀNG ({cartItems.length} món)</Text>

        {cartItems.length === 0 ? (
          <Text style={styles.emptyCartText}>Chưa có sản phẩm nào trên hóa đơn.</Text>
        ) : (
          cartItems.map((item) => (
            <View key={item.variant_id} style={styles.ticketItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketItemName}>{item.product_name}</Text>
                <Text style={styles.ticketItemPrice}>
                  {formatVnd(item.price)} × {item.qty}
                </Text>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleUpdateQty(item.variant_id, -1)}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{item.qty}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleUpdateQty(item.variant_id, 1)}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.ticketLineTotal}>{formatVnd(item.price * item.qty)}</Text>
            </View>
          ))
        )}

        {/* Loyalty Point Redemption */}
        {customerInfo && (customerInfo.points || 0) > 0 && cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.pointsToggle}
            onPress={() => setUsePoints(!usePoints)}
          >
            <Ionicons
              name={usePoints ? 'checkbox' : 'square-outline'}
              size={20}
              color={COLORS.purple}
            />
            <Text style={styles.pointsToggleText}>
              Trừ điểm tích lũy: -{formatVnd(pointsDiscount)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Totals */}
        <View style={styles.totalBlock}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Tạm tính:</Text>
            <Text style={styles.sumVal}>{formatVnd(subtotal)}</Text>
          </View>
          {pointsDiscount > 0 && (
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, { color: COLORS.greenCheck }]}>Trừ điểm:</Text>
              <Text style={[styles.sumVal, { color: COLORS.greenCheck }]}>-{formatVnd(pointsDiscount)}</Text>
            </View>
          )}
          <View style={[styles.sumRow, styles.grandTotalRow]}>
            <Text style={styles.grandLabel}>KHÁCH PHẢI TRẢ:</Text>
            <Text style={styles.grandVal}>{formatVnd(finalTotal)}</Text>
          </View>
        </View>

        {/* Payment mode */}
        <View style={styles.payModeRow}>
          <TouchableOpacity
            style={[styles.payModeBtn, paymentMethod === 'cash' && styles.payModeBtnActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Ionicons
              name="cash"
              size={18}
              color={paymentMethod === 'cash' ? COLORS.white : COLORS.text}
            />
            <Text
              style={[
                styles.payModeBtnText,
                paymentMethod === 'cash' && styles.payModeBtnTextActive,
              ]}
            >
              Tiền mặt
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payModeBtn, paymentMethod === 'vietqr' && styles.payModeBtnActive]}
            onPress={() => setPaymentMethod('vietqr')}
          >
            <Ionicons
              name="qr-code"
              size={18}
              color={paymentMethod === 'vietqr' ? COLORS.white : COLORS.text}
            />
            <Text
              style={[
                styles.payModeBtnText,
                paymentMethod === 'vietqr' && styles.payModeBtnTextActive,
              ]}
            >
              Quét VietQR
            </Text>
          </TouchableOpacity>
        </View>

        {paymentMethod === 'cash' && (
          <View style={styles.cashBox}>
            <Text style={styles.cashLabel}>Tiền khách đưa:</Text>
            <TextInput
              style={styles.cashInput}
              keyboardType="number-pad"
              placeholder="Ví dụ: 1500000"
              value={cashGiven}
              onChangeText={setCashGiven}
            />
            {Number(cashGiven) > 0 && (
              <Text style={styles.changeText}>
                Tiền thừa trả khách: <Text style={styles.bold}>{formatVnd(changeMoney)}</Text>
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.checkoutBtn, submitting && styles.btnDisabled]}
          onPress={handleCheckout}
          disabled={submitting||!!createdOrder}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.checkoutBtnText}>HOÀN TẤT ĐƠN HÀNG ({formatVnd(finalTotal)})</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* VietQR Modal */}
      <Modal visible={!!qrModal} transparent animationType="slide" onRequestClose={()=>setQrModal(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>MÃ VIETQR THANH TOÁN TẠI QUẦY</Text>
            <Text style={styles.modalSub}>Hướng dẫn khách đưa camera điện thoại quét mã</Text>

            {qrModal && (
              <Image source={{ uri: qrModal }} style={styles.qrImage} resizeMode="contain" />
            )}

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                setQrModal(null);
              }}
            >
              <Text style={styles.modalDoneText}>ĐÓNG · TIẾP TỤC CHỜ NGÂN HÀNG XÁC NHẬN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 14, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 12, fontWeight: '800', color: COLORS.purpleDark, marginBottom: 10 },
  lookupRow: { flexDirection: 'row', gap: 8 },
  lookupInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  lookupBtn: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  customerResultBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  custName: { fontSize: 13, fontWeight: '700', color: COLORS.purpleDark },
  custPhone: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  pointsBadge: { backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pointsBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.purpleDark },
  searchProdInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 10,
  },
  quickProdScroll: { gap: 8, paddingBottom: 4 },
  prodPill: {
    width: 130,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prodPillName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  prodPillPrice: { fontSize: 12, fontWeight: '800', color: COLORS.redSale, marginTop: 4 },
  emptyCartText: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginVertical: 14 },
  ticketItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ticketItemName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  ticketItemPrice: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  counterBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  counterBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  counterValue: { fontSize: 12, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  ticketLineTotal: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  pointsToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 10 },
  pointsToggleText: { fontSize: 12, color: COLORS.purpleDark, fontWeight: '700' },
  totalBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  sumLabel: { fontSize: 12, color: COLORS.muted },
  sumVal: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  grandTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  grandLabel: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  grandVal: { fontSize: 16, fontWeight: '900', color: COLORS.redSale },
  payModeRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  payModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    gap: 6,
  },
  payModeBtnActive: { backgroundColor: COLORS.purple },
  payModeBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  payModeBtnTextActive: { color: COLORS.white },
  cashBox: { marginBottom: 12 },
  cashLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 4 },
  cashInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  changeText: { fontSize: 12, color: COLORS.greenCheck, marginTop: 4 },
  bold: { fontWeight: '700' },
  checkoutBtn: {
    backgroundColor: COLORS.greenCheck,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  checkoutBtnText: { color: COLORS.white, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 14, fontWeight: '800', color: COLORS.purpleDark },
  modalSub: { fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 2, marginBottom: 16 },
  qrImage: { width: 220, height: 220, marginBottom: 16 },
  modalDoneBtn: {
    width: '100%',
    backgroundColor: COLORS.greenCheck,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDoneText: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
});
