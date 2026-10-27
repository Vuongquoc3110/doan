import {AppAlert as Alert} from '../../../src/utils/alert';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/api/client';
import { formatVnd, formatDateTime } from '../../../src/utils/format';
import { resolveMediaUrl } from '../../../src/utils/media';
import CustomerPageIntro from '../../../src/components/CustomerPageIntro';
import { useBreakpoint } from '../../../src/hooks/useBreakpoint';
import COLORS from '../../../src/theme/colors';
import { VerifiedReviewForm } from '../../../src/components/VerifiedReviewForm';

const STATUS_LABELS: Record<string, string> = {"PENDING":"Chờ xác nhận","CONFIRMED":"Đã xác nhận","PREPARING":"Đang chuẩn bị","READY":"Sẵn sàng giao","SHIPPING":"Đang giao hàng","COMPLETED":"Đã hoàn tất","CANCELLED":"Đã hủy","RETURNED":"Đã đổi trả"};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDesktop } = useBreakpoint();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/v1/orders/${id}`);
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng #{id}...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>{isError ? 'Chưa tải được đơn hàng. Vui lòng thử lại.' : 'Không tìm thấy đơn hàng này.'}</Text>
        {isError && <TouchableOpacity style={styles.backBtn} onPress={() => refetch()}><Text style={styles.backBtnText}>Thử lại</Text></TouchableOpacity>}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Quay lại danh sách</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCancelOrder = () => {
    Alert.alert('Xác nhận hủy', 'Bạn có chắc chắn muốn hủy đơn hàng này không?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/v1/orders/${id}/cancel`, {
              reason: 'Khách hàng yêu cầu hủy từ ứng dụng di động',
            });
            Alert.alert('Thành công', 'Đã hủy đơn hàng thành công.');
            refetch();
          } catch (err: any) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy đơn hàng');
          }
        },
      },
    ]);
  };

  const isEligibleForReturn = order.canReturn === true;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{headerShown: false}}/>
      <CustomerPageIntro title="Chi tiết đơn hàng" subtitle="Theo dõi hành trình đơn hàng và kiểm tra thông tin mua sắm của bạn."/>
      {/* Header Info */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orderCode}>{order.code}</Text>
            <Text style={styles.orderDate}>{formatDateTime(order.created_at)}</Text>
          </View>
          <View style={styles.badgePending}>
            <Text style={styles.badgeText}>{STATUS_LABELS[order.status] || order.status_label || order.status}</Text>
          </View>
        </View>

        <View style={styles.storeRow}>
          <Ionicons name="storefront" size={16} color={COLORS.purpleDark} />
          <Text style={styles.storeName}>Chi nhánh: {order.store_name}</Text>
        </View>
      </View>

      <View style={[styles.detailLayout, isDesktop && {flexDirection: 'row', alignItems: 'flex-start'}]}><View style={{flex: 1, minWidth: 0}}>
      {/* 48-Hour Return Guarantee Banner */}
      {order.returnRequest&&<View style={styles.card}><Text style={styles.sectionTitle}>PHẢN HỒI YÊU CẦU ĐỔI TRẢ</Text><Text>Trạng thái: {order.returnRequest.status==='pending'?'Đang chờ xử lý':order.returnRequest.status==='rejected'?'Đã từ chối':'Đã phê duyệt'}</Text><Text>{order.returnRequest.decision_note||'Cửa hàng sẽ kiểm tra và phản hồi yêu cầu của bạn.'}</Text></View>}
      {order.status === 'COMPLETED' && (
        <View style={styles.warrantyCard}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.greenCheck} />
          <View style={styles.warrantyContent}>
            <Text style={styles.warrantyTitle}>CHÍNH SÁCH ĐỔI TRẢ TRONG 48H</Text>
            <Text style={styles.warrantyDesc}>
              {isEligibleForReturn
                ? 'Đơn hàng còn trong thời hạn bảo hành 48 giờ. Bạn có thể yêu cầu đổi trả hoặc hoàn tiền nếu trái cây không đạt chuẩn tươi ngon.'
                : 'Đã hết thời hạn yêu cầu đổi trả 48 giờ kể từ khi nhận hàng.'}
            </Text>

            {isEligibleForReturn && (
              <TouchableOpacity
                style={styles.returnActionBtn}
                onPress={() => router.push(`/(customer)/order/return/${order.id}`)}
              >
                <Text style={styles.returnActionText}>YÊU CẦU ĐỔI TRẢ TRÁI CÂY (48H)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Status History Timeline */}
      {order.history && order.history.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LỊCH TRÌNH VẬN CHUYỂN</Text>
          <View style={styles.timelineContainer}>
            {order.history.map((hist: any, idx: number) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineIconCol}>
                  <View style={[styles.timelineDot, idx === 0 && styles.timelineDotActive]} />
                  {idx < order.history.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{STATUS_LABELS[hist.status] || hist.status_label || hist.status}</Text>
                  <Text style={styles.timelineNote}>{hist.note || 'Cập nhật hệ thống'}</Text>
                  <Text style={styles.timelineTime}>{formatDateTime(hist.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Items list */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>DANH SÁCH SẢN PHẨM ({order.items?.length || 0})</Text>
        {order.items?.map((item: any) => (
          <View key={item.id} style={styles.itemRow}>
            <Image
              source={{
                uri: item.thumbnail ? resolveMediaUrl(item.thumbnail) : 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=300',
              }}
              style={styles.itemThumb}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product_name}
              </Text>
              <Text style={styles.itemVariant}>Quy cách: {item.variant_label || 'Tiêu chuẩn'}</Text>
              <Text style={styles.itemQtyPrice}>
                {formatVnd(item.unit_price)} × {item.qty}
              </Text>
            </View>
            <Text style={styles.itemLineTotal}>{formatVnd(item.total_price || item.unit_price * item.qty)}</Text>
          </View>
        ))}
      </View>

      {/* Recipient details */}
      {order.status==='COMPLETED'&&<View style={styles.card}>{Array.from(new Set<number>((order.items||[]).map((item:any)=>Number(item.product_id)).filter((id:number)=>id>0))).map(productId=><View key={productId}><Text style={styles.itemName}>{order.items.find((item:any)=>Number(item.product_id)===productId)?.product_name}</Text><VerifiedReviewForm orderId={order.id} productId={productId}/></View>)}</View>}
      </View><View style={isDesktop ? {width: 390} : {width: '100%'}}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>THÔNG TIN GIAO HÀNG</Text>
        <Text style={styles.detailText}>
          Người nhận: <Text style={styles.bold}>{order.receiver_name}</Text>
        </Text>
        <Text style={styles.detailText}>
          Số điện thoại: <Text style={styles.bold}>{order.receiver_phone}</Text>
        </Text>
        <Text style={styles.detailText}>
          Địa chỉ: <Text style={styles.bold}>{order.receiver_address}</Text>
        </Text>
        {order.delivery_slot && (
          <Text style={styles.detailText}>
            Khung giờ hẹn: <Text style={styles.bold}>{order.delivery_slot}</Text>
          </Text>
        )}
        {order.greeting_message && (
          <View style={styles.giftNoteBox}>
            <Text style={styles.giftNoteLabel}>Lời chúc & Nơ lụa:</Text>
            <Text style={styles.giftNoteVal}>{order.greeting_message}</Text>
          </View>
        )}
      </View>

      {/* Payment details & breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>CHI TIẾT THANH TOÁN</Text>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Tạm tính tiền hàng:</Text>
          <Text style={styles.calcVal}>{formatVnd(order.subtotal)}</Text>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Phí giao hàng:</Text>
          <Text style={styles.calcVal}>{formatVnd(order.ship_fee || 0)}</Text>
        </View>
        {order.discount > 0 && (
          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: COLORS.greenCheck }]}>Voucher giảm giá:</Text>
            <Text style={[styles.calcVal, { color: COLORS.greenCheck }]}>-{formatVnd(order.discount)}</Text>
          </View>
        )}
        {order.points_redeemed > 0 && (
          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: COLORS.greenCheck }]}>Điểm tích lũy:</Text>
            <Text style={[styles.calcVal, { color: COLORS.greenCheck }]}>-{formatVnd(order.points_redeemed)}</Text>
          </View>
        )}
        <View style={[styles.calcRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>TỔNG THANH TOÁN:</Text>
          <Text style={styles.totalVal}>{formatVnd(order.total)}</Text>
        </View>

        <View style={styles.payStatusRow}>
          <Text style={styles.payMethodText}>
            Phương thức: {order.payment_method?.toUpperCase()}
          </Text>
          <View
            style={[
              styles.payStatusBadge,
              { backgroundColor: order.payment_status === 'paid' ? '#DCFCE7' : '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.payStatusBadgeText,
                { color: order.payment_status === 'paid' ? COLORS.greenCheck : '#B45309' },
              ]}
            >
              {order.payment_status === 'paid' ? 'ĐÃ THANH TOÁN' : order.payment_status === 'refunded' ? 'ĐÃ HOÀN TIỀN' : 'CHƯA THANH TOÁN'}
            </Text>
          </View>
        </View>
      </View>

      {/* Cancel Order Action (if pending) */}
      {order.status === 'PENDING' && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelOrder}>
          <Text style={styles.cancelBtnText}>HỦY ĐƠN HÀNG NÀY</Text>
        </TouchableOpacity>
      )}

      {/* Hotline Support */}
      <View style={styles.supportBox}>
        <Ionicons name="call-outline" size={20} color={COLORS.purpleDark} />
        <Text style={styles.supportText}>
          Cần hỗ trợ về đơn hàng này? Gọi ngay Hotline VIP:{' '}
          <Text style={styles.bold}>1900 636 586</Text>
        </Text>
      </View>
      </View></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  detailLayout: {gap: 24},
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxWidth: 1320, alignSelf: 'center'},
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  headerRow: { flexWrap: 'wrap', gap: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 26, fontWeight: '900', color: COLORS.purpleDark },
  orderDate: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  badgePending: { backgroundColor: COLORS.purpleLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800', color: COLORS.purpleDark },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  storeName: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  warrantyCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  warrantyContent: { flex: 1 },
  warrantyTitle: { fontSize: 12, fontWeight: '800', color: COLORS.greenCheck },
  warrantyDesc: { fontSize: 12, color: '#166534', marginTop: 4, lineHeight: 17 },
  returnActionBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  returnActionText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  timelineContainer: { paddingLeft: 6 },
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  timelineIconCol: { alignItems: 'center', width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.border },
  timelineDotActive: { backgroundColor: COLORS.purple },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineStatus: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  timelineNote: { fontSize: 14, lineHeight: 22, color: COLORS.muted, marginTop: 2 },
  timelineTime: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  itemRow: { flexWrap: 'wrap', rowGap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemThumb: { width: 84, height: 96, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 10 },
  itemInfo: { flex: 1, minWidth: 150 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 23 },
  itemVariant: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  itemQtyPrice: { fontSize: 11, color: COLORS.purpleDark, fontWeight: '600', marginTop: 2 },
  itemLineTotal: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  detailText: { fontSize: 14, color: COLORS.text, marginBottom: 6, lineHeight: 24 },
  bold: { fontWeight: '700' },
  giftNoteBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  giftNoteLabel: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  giftNoteVal: { fontSize: 12, color: '#92400E', marginTop: 2, fontStyle: 'italic' },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  calcLabel: { fontSize: 12, color: COLORS.muted },
  calcVal: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  totalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  totalVal: { fontSize: 26, fontWeight: '900', color: COLORS.redSale },
  payStatusRow: { flexWrap: 'wrap', gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  payMethodText: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  payStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  payStatusBadgeText: { fontSize: 10, fontWeight: '800' },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelBtnText: { color: COLORS.redSale, fontSize: 13, fontWeight: '800' },
  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  supportText: { flex: 1, fontSize: 12, color: COLORS.purpleDark },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  errorText: { fontSize: 14, color: COLORS.redSale, fontWeight: '700', marginBottom: 12 },
  backBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
