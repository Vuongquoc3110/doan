import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  
  Modal,
  Image,
  Linking} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { DeliveryQuotePanel } from '../../src/components/DeliveryQuotePanel';
import apiClient from '../../src/api/client';
import { useCartStore } from '../../src/store/useCartStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { formatVnd } from '../../src/utils/format';
import CustomerPageIntro from '../../src/components/CustomerPageIntro';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { resolveMediaUrl } from '../../src/utils/media';
import COLORS from '../../src/theme/colors';

const DELIVERY_SLOTS = [
  'Giao hỏa tốc trong 2 giờ ⚡',
  'Buổi sáng (08:30 - 11:30)',
  'Buổi chiều (13:30 - 17:30)',
  'Buổi tối (18:00 - 21:00)',
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const { coupon } = useLocalSearchParams<{ coupon?: string }>();
  const { items, subtotal, selectedStoreId, selectedStoreName, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [recipientName, setRecipientName] = useState(user?.fullName || '');
  const [recipientPhone, setRecipientPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(DELIVERY_SLOTS[0]);
  const [cardMessage, setCardMessage] = useState('');
  const [ribbonColor, setRibbonColor] = useState('Tím Klever');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftBalance, setGiftBalance] = useState(0);
  const [vatCompany, setVatCompany] = useState('');
  const [vatTaxCode, setVatTaxCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Coupon & points
  const [couponCode, setCouponCode] = useState(coupon || '');
  useEffect(() => { if (coupon) setCouponCode(coupon); }, [coupon]);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'vnpay' | 'cod'>('cod');
  const [deliveryQuote,setDeliveryQuote]=useState<any>(null);
  const {data:capabilities}=useQuery({queryKey:['capabilities'],queryFn:async()=>(await apiClient.get('/v1/capabilities')).data.data});

  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const pointsToUse = usePoints && user?.points ? Math.min(user.points, 50) : 0;
  const pointsDiscount = pointsToUse * 1000;
  const hasDeliveryQuote=deliveryQuote?.address===address.trim()&&deliveryQuote?.storeId===selectedStoreId&&deliveryQuote?.expiresAt>Date.now();
  const shippingFee = deliveryType !== 'delivery'?0:capabilities?.deliveryProvider==='ahamove'?Number(hasDeliveryQuote?deliveryQuote.fee:0):subtotal<500000?25000:0;
  const finalTotal = Math.max(0, subtotal + shippingFee - appliedDiscount - pointsDiscount - giftBalance);
  useEffect(() => { setAppliedDiscount(0); }, [couponCode, subtotal]);
  useEffect(() => { setGiftBalance(0); }, [giftCardCode]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await apiClient.post('/v1/coupons/check', { code: couponCode.trim(), orderAmount: subtotal });
      const discount = Number(res.data?.data?.discountAmount) || 0;
      setAppliedDiscount(discount);
      setStatusMessage(`Đã áp dụng mã, giảm ${formatVnd(discount)}.`);
      Alert.alert('Thành công', `Áp dụng mã giảm giá thành công! Giảm ${formatVnd(discount)}`);
    } catch (err: any) {
      setAppliedDiscount(0);
      setStatusMessage(err.response?.data?.message || 'Mã giảm giá không hợp lệ.');
      Alert.alert('Không hợp lệ', err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handlePlaceOrder = async () => {
    if (submitting || createdOrder) return;
    if (!items.length) { setStatusMessage('Giỏ hàng đang trống.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) || !Number.isFinite(Date.parse(deliveryDate)) || new Date(deliveryDate).toISOString().slice(0, 10) !== deliveryDate || deliveryDate < today) { setStatusMessage('Vui lòng chọn ngày nhận hợp lệ từ hôm nay (YYYY-MM-DD).'); return; }
    if (!!vatCompany.trim() !== !!vatTaxCode.trim()) { setStatusMessage('Vui lòng nhập cả tên công ty và mã số thuế để yêu cầu hóa đơn.'); return; }
    if (!recipientName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập họ tên người nhận');
      return;
    }
    if (!recipientPhone.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại người nhận');
      return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        deliveryQuoteId:deliveryType==='delivery'&&deliveryQuote?.address===address.trim()&&deliveryQuote?.storeId===selectedStoreId&&deliveryQuote.expiresAt>Date.now()?deliveryQuote.quoteId:undefined,
        storeId: selectedStoreId,
        deliveryType: deliveryType === 'delivery' ? 'ship' : 'pickup',
        receiverName: recipientName.trim(),
        receiverPhone: recipientPhone.trim(),
        receiverAddress: deliveryType === 'delivery' ? address.trim() : `Nhận tại cửa hàng: ${selectedStoreName}`,
        deliverySlot: selectedSlot,
        deliveryDate: deliveryDate,
        ribbonColor: ribbonColor,
        giftCardCode: giftBalance > 0 ? giftCardCode.trim() : undefined,
        vatRequest: vatCompany.trim() ? { company: vatCompany.trim(), taxCode: vatTaxCode.trim() } : undefined,
        greetingMessage: cardMessage.trim() ? `Lời nhắn: "${cardMessage.trim()}" | Thắt nơ: ${ribbonColor}` : undefined,
        paymentMethod: paymentMethod,
        couponCode: appliedDiscount > 0 ? couponCode.trim() : undefined,
        pointsToUse: pointsToUse,
        items: items.map((i) => ({ variantId: i.variant_id, qty: i.qty })),
      };

      const res = await apiClient.post('/v1/orders/checkout', payload);
      const raw = res.data.data;
      const orderData = { ...raw, id: raw.orderId, order_code: raw.orderCode, payment_payload: { qr_url: raw.paymentData?.qrUrl, bank_name: raw.paymentData?.bankName, account_number: raw.paymentData?.accountNumber } };
      setCreatedOrder(orderData);
      setStatusMessage(`Đặt hàng thành công. Mã đơn: ${orderData.order_code}.`);
      await clearCart().catch(() => {});

      if (paymentMethod === 'vietqr' && orderData.payment_payload?.qr_url) {
        setQrModalVisible(true);
      } else if(paymentMethod==='vnpay'&&raw.paymentData?.vnpayUrl){
        await Linking.openURL(raw.paymentData.vnpayUrl);
      } else {
        Alert.alert(
          'Đặt hàng thành công! 🎉',
          `Mã đơn hàng: ${orderData.order_code}. VQ FRUIT sẽ liên hệ quý khách trong ít phút!`,
          [
            {
              text: 'Xem đơn hàng',
              onPress: () => router.replace(`/(customer)/order/${orderData.id}`),
            },
          ]
        );
      }
    } catch (err: any) {
      setStatusMessage(err.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      Alert.alert('Lỗi đặt hàng', err.response?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{headerShown: false}}/>
      <CustomerPageIntro title="Thanh toán đơn hàng" subtitle="Chỉ còn một bước để mang sự tươi ngon đến bạn và người thƱơng."/>
      {!!statusMessage && <Text accessibilityLiveRegion="polite" style={{ padding: 16, color: COLORS.text, backgroundColor: COLORS.primaryLight }}>{statusMessage}</Text>}
      {createdOrder && <TouchableOpacity style={{ padding: 16 }} onPress={() => router.replace(`/(customer)/order/${createdOrder.id}`)}><Text style={{ color: COLORS.primary }}>Xem đơn hàng {createdOrder.order_code} →</Text></TouchableOpacity>}
      <View style={[styles.checkoutLayout, isDesktop && {flexDirection: 'row', alignItems: 'flex-start'}]}><View style={{flex: 1, minWidth: 0}}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NGÀY NHẬN HÀNG & DỊCH VỤ</Text>
        <Text style={styles.inputLabel}>Ngày nhận (YYYY-MM-DD)</Text>
        <TextInput accessibilityLabel="Ngày nhận hàng" style={styles.input} value={deliveryDate} onChangeText={setDeliveryDate} placeholder="YYYY-MM-DD"/>
        <TouchableOpacity onPress={() => router.push('/(customer)/stores')} style={{ paddingVertical: 14 }}><Text style={{ color: COLORS.primary }}>Đổi cửa hàng giao / nhận →</Text></TouchableOpacity>
        <Text style={styles.inputLabel}>Thẻ quà tặng / E-voucher</Text>
        <TextInput accessibilityLabel="Mã thẻ quà tặng" style={styles.input} value={giftCardCode} onChangeText={setGiftCardCode} autoCapitalize="characters" placeholder="Nhập mã thẻ"/>
        <TouchableOpacity style={{ paddingVertical: 14 }} onPress={async () => { try { const res = await apiClient.post('/v1/gift-cards/check', { code: giftCardCode.trim() }); const balance = Number(res.data.data.balance) || 0; setGiftBalance(balance); setStatusMessage(`Thẻ còn ${formatVnd(balance)}. Số tiền sử dụng sẽ được xác nhận khi đặt hàng.`); } catch (e: any) { setGiftBalance(0); setStatusMessage(e.response?.data?.message || 'Không kiểm tra được thẻ.'); } }}><Text style={{ color: COLORS.primary }}>Kiểm tra thẻ</Text></TouchableOpacity>
        <Text style={styles.inputLabel}>Yêu cầu hóa đơn (tùy chọn)</Text>
        <TextInput accessibilityLabel="Tên công ty xuất hóa đơn" style={styles.input} value={vatCompany} onChangeText={setVatCompany} placeholder="Tên công ty"/>
        <TextInput accessibilityLabel="Mã số thuế" style={styles.input} value={vatTaxCode} onChangeText={setVatTaxCode} placeholder="Mã số thuế"/>
        <Text style={{ color: COLORS.muted, marginTop: 10 }}>Số tiền cuối cùng sẽ được xác nhận khi bạn đặt hàng.</Text>
      </View>

      {deliveryType==='delivery'&&capabilities?.deliveryProvider==='ahamove'&&<View style={styles.card}><DeliveryQuotePanel storeId={selectedStoreId} address={address} name={recipientName} phone={recipientPhone} onQuote={setDeliveryQuote} onAddress={setAddress}/></View>}
      {/* Delivery Method Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>HÌNH THỨC NHẬN HÀNG</Text>
        <View style={styles.typeSelectorRow}>
          <TouchableOpacity
            style={[styles.typeBtn, deliveryType === 'delivery' && styles.typeBtnActive]}
            onPress={() => setDeliveryType('delivery')}
          >
            <Ionicons
              name="bicycle"
              size={18}
              color={deliveryType === 'delivery' ? COLORS.white : COLORS.text}
            />
            <Text
              style={[styles.typeBtnText, deliveryType === 'delivery' && styles.typeBtnTextActive]}
            >
              Giao tận nơi (2H)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, deliveryType === 'pickup' && styles.typeBtnActive]}
            onPress={() => setDeliveryType('pickup')}
          >
            <Ionicons
              name="storefront"
              size={18}
              color={deliveryType === 'pickup' ? COLORS.white : COLORS.text}
            />
            <Text
              style={[styles.typeBtnText, deliveryType === 'pickup' && styles.typeBtnTextActive]}
            >
              Nhận tại cửa hàng
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.storeFulfillBox}>
          <Text style={styles.storeFulfillLabel}>Chi nhánh xử lý đơn:</Text>
          <Text style={styles.storeFulfillName}>{selectedStoreName}</Text>
        </View>
      </View>

      {/* Recipient Information Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>THÔNG TIN NGƯỜI NHẬN</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Họ và tên người nhận (*)</Text>
          <TextInput
            style={styles.input}
            value={recipientName}
            onChangeText={setRecipientName}
            placeholder="Ví dụ: Nguyễn Văn An"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Số điện thoại (*)</Text>
          <TextInput
            style={styles.input}
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            placeholder="Ví dụ: 0900000011"
            keyboardType="phone-pad"
          />
        </View>

        {deliveryType === 'delivery' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Địa chỉ giao hàng chi tiết (*)</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Số nhà, tên đường, phường, quận..."
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Khung giờ giao hàng</Text>
          <View style={styles.slotsRow}>
            {DELIVERY_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotPill, selectedSlot === slot && styles.slotPillActive]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text
                  style={[
                    styles.slotPillText,
                    selectedSlot === slot && styles.slotPillTextActive,
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Luxury Gift Card Message & Ribbon */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DỊCH VỤ QUÀ TẶNG & THIỆP CHÚC MỪNG</Text>
        <Text style={styles.cardHelp}>
          VQ FRUIT hỗ trợ in thiệp trang nhã & thắt nơ lụa miễn phí cho tất cả giỏ quà biếu.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Lời chúc in trên thiệp (Tùy chọn)</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={cardMessage}
            onChangeText={setCardMessage}
            placeholder="Chúc mừng sinh nhật / Kính chúc quý đối tác năm mới an khang thịnh vượng..."
            multiline
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Màu nơ lụa thắt giỏ:</Text>
          <View style={styles.ribbonRow}>
            {['Tím Klever VIP', 'Đỏ Hoàng Gia', 'Vàng Ánh Kim'].map((ribbon) => (
              <TouchableOpacity
                key={ribbon}
                style={[styles.ribbonPill, ribbonColor === ribbon && styles.ribbonPillActive]}
                onPress={() => setRibbonColor(ribbon)}
              >
                <Text
                  style={[
                    styles.ribbonPillText,
                    ribbonColor === ribbon && styles.ribbonPillTextActive,
                  ]}
                >
                  {ribbon}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Coupon & Points */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MÃ GIẢM GIÁ & TÍCH ĐIỂM</Text>

        <View style={styles.couponInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Nhập mã (KLEVER50K, TET2026...)"
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.applyCouponBtn} onPress={handleApplyCoupon}>
            <Text style={styles.applyCouponText}>Áp dụng</Text>
          </TouchableOpacity>
        </View>

        {appliedDiscount > 0 && (
          <Text style={styles.couponSuccess}>✓ Đã áp dụng giảm {formatVnd(appliedDiscount)}</Text>
        )}

        {isAuthenticated && user && (user.points || 0) > 0 && (
          <TouchableOpacity
            style={styles.pointsToggleRow}
            onPress={() => setUsePoints(!usePoints)}
          >
            <Ionicons
              name={usePoints ? 'checkbox' : 'square-outline'}
              size={22}
              color={COLORS.purple}
            />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.pointsToggleTitle}>
                Dùng điểm tích lũy: {(user.points || 0).toLocaleString('vi-VN')} điểm
              </Text>
              <Text style={styles.pointsToggleSub}>
                Quy đổi giảm tối đa -{formatVnd(pointsDiscount)} vào đơn hàng
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Payment Method Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PHƯƠNG THỨC THANH TOÁN</Text>

        <TouchableOpacity
          style={[styles.payMethodOption, paymentMethod === 'vietqr' && styles.payMethodActive]}
          onPress={() => setPaymentMethod('vietqr')}
          disabled={!capabilities?.vietqr}
        >
          <Ionicons name="qr-code" size={20} color={COLORS.purpleDark} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.payMethodTitle}>Chuyển khoản VietQR Ngân hàng (Khuyên dùng)</Text>
            <Text style={styles.payMethodDesc}>Mã QR động tự điền số tiền và nội dung chuyển khoản</Text>
          </View>
          <Ionicons
            name={paymentMethod === 'vietqr' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={COLORS.purple}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payMethodOption, paymentMethod === 'vnpay' && styles.payMethodActive]}
          onPress={() => setPaymentMethod('vnpay')}
          disabled={!capabilities?.vnpay}
        >
          <Ionicons name="card" size={20} color="#0284C7" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.payMethodTitle}>Ví điện tử VNPay / Thẻ ATM</Text>
            <Text style={styles.payMethodDesc}>Cổng thanh toán thẻ nội địa và quốc tế</Text>
          </View>
          <Ionicons
            name={paymentMethod === 'vnpay' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={COLORS.purple}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payMethodOption, paymentMethod === 'cod' && styles.payMethodActive]}
          onPress={() => setPaymentMethod('cod')}
        >
          <Ionicons name="cash" size={20} color={COLORS.greenCheck} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.payMethodTitle}>Tiền mặt khi nhận hàng (COD)</Text>
            <Text style={styles.payMethodDesc}>Thanh toán cho nhân viên giao hàng sau khi kiểm tra trái cây</Text>
          </View>
          <Ionicons
            name={paymentMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={COLORS.purple}
          />
        </TouchableOpacity>
      </View>

      {/* Order Summary */}
      </View><View style={isDesktop ? {width: 390} : {width: '100%'}}>
      <View style={styles.card}><Text style={styles.cardTitle}>SẢN PHẨM & QUY CÁCH ĐÃ CHỌN</Text>{items.map(item => <View key={item.id} style={{ paddingVertical: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}><Image source={{uri: resolveMediaUrl(item.thumbnail)}} style={{width: 72, height: 72, borderRadius: 12}}/><Text style={{ fontSize: 15, lineHeight: 23, color: COLORS.text, fontWeight: '600' }}>{item.product_name}</Text><Text style={{ color: COLORS.muted }}>{item.qty} × {item.variant_label} · {formatVnd(item.unit_price)} / đơn vị</Text><Text style={{ color: COLORS.primary }}>{formatVnd(item.unit_price * item.qty)}</Text></View>)}</View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>CHI TIẾT THANH TOÁN</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính hàng ({items.length} món):</Text>
          <Text style={styles.summaryVal}>{formatVnd(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phí giao hàng:</Text>
          <Text style={styles.summaryVal}>
            {deliveryType==='delivery'&&capabilities?.deliveryProvider==='ahamove'&&!hasDeliveryQuote?'Cần báo phí':shippingFee===0?'MIỄN PHÍ':formatVnd(shippingFee)}
          </Text>
        </View>
        {appliedDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.greenCheck }]}>Voucher giảm giá:</Text>
            <Text style={[styles.summaryVal, { color: COLORS.greenCheck }]}>-{formatVnd(appliedDiscount)}</Text>
          </View>
        )}
        {pointsDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.greenCheck }]}>Trừ điểm tích lũy:</Text>
            <Text style={[styles.summaryVal, { color: COLORS.greenCheck }]}>-{formatVnd(pointsDiscount)}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>TỔNG CỘNG:</Text>
          <Text style={styles.grandTotalVal}>{formatVnd(finalTotal)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitOrderBtn, submitting && styles.btnDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitOrderBtnText}>ĐẶT HÀNG NGAY ({formatVnd(finalTotal)})</Text>
          )}
        </TouchableOpacity>
      </View>

      </View></View>
      {/* VietQR Modal */}
      <Modal visible={qrModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QUÉT MÃ VIETQR ĐỂ THANH TOÁN</Text>
            <Text style={styles.modalSubtitle}>
              Mở App ngân hàng bất kỳ (Vietcombank, MB, Techcombank,...) để quét mã
            </Text>

            {createdOrder?.payment_payload?.qr_url && (
              <Image
                source={{ uri: createdOrder.payment_payload.qr_url }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            )}

            <View style={styles.transferInfoBox}>
              <Text style={styles.transferInfoItem}>
                Ngân hàng: <Text style={styles.bold}>{createdOrder?.payment_payload?.bank_name || 'MB Bank'}</Text>
              </Text>
              <Text style={styles.transferInfoItem}>
                Số tài khoản: <Text style={styles.bold}>{createdOrder?.payment_payload?.account_number}</Text>
              </Text>
              <Text style={styles.transferInfoItem}>
                Số tiền: <Text style={[styles.bold, { color: COLORS.redSale }]}>{formatVnd(createdOrder?.total || 0)}</Text>
              </Text>
              <Text style={styles.transferInfoItem}>
                Nội dung CK: <Text style={[styles.bold, { color: COLORS.purpleDark }]}>{createdOrder?.order_code}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.donePaymentBtn}
              onPress={() => {
                setQrModalVisible(false);
                router.replace(`/(customer)/order/${createdOrder.id}`);
              }}
            >
              <Text style={styles.donePaymentText}>TÔI ĐÃ CHUYỂN KHOẢN XONG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  checkoutLayout: {gap: 24},
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxWidth: 1320, alignSelf: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: COLORS.purpleDark, marginBottom: 20 },
  cardHelp: { fontSize: 12, color: COLORS.muted, marginBottom: 10, lineHeight: 16 },
  typeSelectorRow: { flexWrap: 'wrap', flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: { minWidth: 180, minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    gap: 6,
  },
  typeBtnActive: { backgroundColor: COLORS.purple },
  typeBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  typeBtnTextActive: { color: COLORS.white },
  storeFulfillBox: {
    backgroundColor: COLORS.purpleLight,
    padding: 10,
    borderRadius: 8,
  },
  storeFulfillLabel: { fontSize: 10, color: COLORS.muted },
  storeFulfillName: { fontSize: 12, fontWeight: '700', color: COLORS.purpleDark, marginTop: 2 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    minHeight: 50,
    marginBottom: 10,
    backgroundColor: '#fafbf7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  slotsRow: { gap: 8 },
  slotPill: { minHeight: 46, justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  slotPillActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight },
  slotPillText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  slotPillTextActive: { color: COLORS.purpleDark, fontWeight: '700' },
  ribbonRow: { flexWrap: 'wrap', flexDirection: 'row', gap: 8 },
  ribbonPill: { minWidth: 110, minHeight: 44, justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  ribbonPillActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight },
  ribbonPillText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  ribbonPillTextActive: { color: COLORS.purpleDark, fontWeight: '700' },
  couponInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  applyCouponBtn: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyCouponText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  couponSuccess: { fontSize: 12, color: COLORS.greenCheck, fontWeight: '700', marginTop: 6 },
  pointsToggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  pointsToggleTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  pointsToggleSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  payMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    backgroundColor: COLORS.inputBg,
  },
  payMethodActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight },
  payMethodTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  payMethodDesc: { fontSize: 12, lineHeight: 19, color: COLORS.muted, marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 12, color: COLORS.muted },
  summaryVal: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  grandTotalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  grandTotalLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  grandTotalVal: { fontSize: 24, fontWeight: '900', color: COLORS.redSale },
  submitOrderBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  btnDisabled: { opacity: 0.6 },
  submitOrderBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { maxWidth: 520,
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 15, fontWeight: '800', color: COLORS.purpleDark, marginBottom: 4 },
  modalSubtitle: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginBottom: 16 },
  qrImage: { width: 220, height: 220, marginBottom: 16 },
  transferInfoBox: {
    width: '100%',
    backgroundColor: COLORS.inputBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 4,
  },
  transferInfoItem: { fontSize: 12, color: COLORS.text },
  bold: { fontWeight: '700' },
  donePaymentBtn: {
    width: '100%',
    backgroundColor: COLORS.greenCheck,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  donePaymentText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
});
