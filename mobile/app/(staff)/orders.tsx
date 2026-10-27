import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd, formatDateTime } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';

const STAFF_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'READY', label: 'Sẵn sàng giao' },
  { key: 'RETURNED', label: 'Đã đổi trả' },
  { key: 'PREPARING', label: 'Đang chuẩn bị' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
];

export default function StaffOrdersScreen() {
  const {data:capabilities}=useQuery({queryKey:['capabilities'],queryFn:async()=>(await apiClient.get('/v1/capabilities')).data.data});
  const [selectedStatus, setSelectedStatus] = useState('all');

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['staff-store-orders', selectedStatus],
    queryFn: async () => {
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const res = await apiClient.get('/v1/staff/orders', { params });
      return res.data?.data || [];
    },
  });

  const handleUpdateStatus = async (orderId: number, newStatus: string, statusLabel: string) => {
    Alert.alert(
      'Cập nhật trạng thái',
      `Xác nhận chuyển đơn hàng sang trạng thái "${statusLabel}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await apiClient.put(`/v1/staff/orders/${orderId}/status`, {
                status: newStatus,
                note: `Nhân viên cập nhật trạng thái: ${statusLabel}`,
              });
              Alert.alert('Thành công', `Đơn hàng đã chuyển sang: ${statusLabel}`);
              refetch();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật trạng thái');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STAFF_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => {
            const active = selectedStatus === item.key;
            return (
              <TouchableOpacity
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setSelectedStatus(item.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải đơn hàng chi nhánh...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Không có đơn hàng nào</Text>
          <Text style={styles.emptySubtitle}>Các đơn hàng phát sinh sẽ xuất hiện ở đây.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderCode}>{item.code}</Text>
                  <Text style={styles.orderDate}>{formatDateTime(item.created_at)}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{item.status_label || item.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.customerLine}>
                👤 Khách hàng: <Text style={styles.bold}>{item.receiver_name}</Text> • {item.receiver_phone}
              </Text>
              <Text style={styles.addressLine} numberOfLines={2}>
                📍 Giao tới: {item.receiver_address}
              </Text>
              {item.delivery_slot && (
                <Text style={styles.slotLine}>⏰ Khung giờ: {item.delivery_slot}</Text>
              )}
              {item.greeting_message && (
                <View style={styles.giftNoteBox}>
                  <Text style={styles.giftNoteText}>🎀 {item.greeting_message}</Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.itemsCount}>{item.items?.reduce((sum: number, line: any) => sum + Number(line.qty), 0) || 0} sản phẩm</Text>
                <Text style={styles.finalTotal}>{formatVnd(item.total)}</Text>
              </View>

              {/* Status Action Buttons for Staff */}
              <View style={styles.actionRow}>
                {item.status === 'PENDING' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnAccept]}
                      onPress={() => handleUpdateStatus(item.id, 'PREPARING', 'Đang chuẩn bị hàng')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />
                      <Text style={styles.btnText}>Nhận đơn & Đóng gói</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.btnCancel]}
                      onPress={() => handleUpdateStatus(item.id, 'CANCELLED', 'Hủy đơn')}
                    >
                      <Text style={[styles.btnText, { color: COLORS.redSale }]}>Từ chối</Text>
                    </TouchableOpacity>
                  </>
                )}

                {['CONFIRMED', 'PREPARING'].includes(item.status) && <TouchableOpacity style={[styles.actionBtn,styles.btnDeliver]} onPress={()=>handleUpdateStatus(item.id,'READY','Đã đóng gói, sẵn sàng bàn giao')}><Text style={styles.btnText}>Đã đóng gói · Sẵn sàng giao</Text></TouchableOpacity>}
                {item.status==='READY'&&(item.delivery_type==='pickup'||capabilities?.deliveryProvider!=='ahamove') && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnDeliver]}
                    onPress={() => handleUpdateStatus(item.id, 'SHIPPING', 'Bàn giao giao hàng')}
                  >
                    <Ionicons name="bicycle-outline" size={16} color={COLORS.white} />
                    <Text style={styles.btnText}>Đã đóng gói xong → Bàn giao shipper</Text>
                  </TouchableOpacity>
                )}
                {item.status==='READY'&&item.delivery_type==='ship'&&capabilities?.deliveryProvider==='ahamove'&&<Text>Đang tự điều phối tài xế Ahamove. Trạng thái cập nhật khi tài xế nhận hàng.</Text>}

                {item.status === 'SHIPPING' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnComplete]}
                    onPress={() => handleUpdateStatus(item.id, 'COMPLETED', 'Giao thành công')}
                  >
                    <Ionicons name="checkmark-done" size={16} color={COLORS.white} />
                    <Text style={styles.btnText}>Xác nhận khách đã nhận hàng (Hoàn tất)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabsContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.inputBg },
  tabBtnActive: { backgroundColor: COLORS.purpleLight, borderWidth: 1, borderColor: COLORS.purple },
  tabText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  tabTextActive: { color: COLORS.purpleDark, fontWeight: '800' },
  listContent: { padding: 16, paddingBottom: 30 },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 14, fontWeight: '800', color: COLORS.purpleDark },
  orderDate: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusBadge: { backgroundColor: COLORS.purpleLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.purpleDark },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  customerLine: { fontSize: 12, color: COLORS.text, marginBottom: 4 },
  addressLine: { fontSize: 12, color: COLORS.muted, marginBottom: 4 },
  slotLine: { fontSize: 11, color: COLORS.purple, fontWeight: '600', marginBottom: 4 },
  giftNoteBox: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  giftNoteText: { fontSize: 11, color: '#92400E', fontStyle: 'italic' },
  bold: { fontWeight: '700' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsCount: { fontSize: 12, color: COLORS.muted },
  finalTotal: { fontSize: 15, fontWeight: '900', color: COLORS.redSale },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  btnAccept: { backgroundColor: COLORS.purple },
  btnDeliver: { backgroundColor: '#0284C7' },
  btnComplete: { backgroundColor: COLORS.greenCheck },
  btnCancel: { backgroundColor: '#FEE2E2', flex: 0.4 },
  btnText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: COLORS.muted },
});
