import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd, formatDateTime } from '../../src/utils/format';
import COLORS from '../../src/theme/admin';
import {Choices,Field,Action} from '../../src/components/AdminControls';
import {AdminOrderDetail} from '../../src/components/AdminOrderDetail';

export default function AdminOrdersScreen() {
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[storeFilter,setStoreFilter]=useState(0),[detailId,setDetailId]=useState<number|null>(null);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [targetStoreId, setTargetStoreId] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all orders
  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-orders-all',search,status,storeFilter],
    queryFn: async () => {
      const res = await apiClient.get('/v1/admin/orders', { params: { limit: 50,search:search.trim()||undefined,status,store_id:storeFilter||undefined } });
      return res.data?.data || [];
    },
  });

  // Fetch 22 stores for transfer selection
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-for-transfer'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/stores');
      return res.data?.data || [];
    },
  });

  const handleOpenTransfer = (order: any) => {
    setSelectedOrder(order);
    setTransferModalVisible(true);
  };

  const handleConfirmTransfer = async () => {
    try {
      setSubmitting(true);
      await apiClient.put(`/v1/admin/orders/${selectedOrder.id}/assign-store`, {
        newStoreId: targetStoreId,
        reason: 'Admin điều phối đơn hàng sang chi nhánh lân cận do tối ưu tuyến đường giao.',
      });

      const storeName = stores.find((s: any) => s.id === targetStoreId)?.name || 'Chi nhánh mới';
      Alert.alert('Thành công', `Đã điều chuyển đơn #${selectedOrder.code} sang: ${storeName}`);
      setTransferModalVisible(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể điều chuyển đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{padding:12,backgroundColor:'white'}}><Field label="Tìm mã đơn / người nhận / SĐT" value={search} onChangeText={setSearch}/><Choices value={status} options={[{id:'all',name:'Tất cả'},...['PENDING','CONFIRMED','PREPARING','READY','SHIPPING','COMPLETED','CANCELLED','RETURNED'].map(id=>({id,name:id}))]} onSelect={setStatus}/><Choices value={storeFilter} options={[{id:0,name:'Mọi chi nhánh'},...stores.map((s:any)=>({id:s.id,name:s.name}))]} onSelect={setStoreFilter}/></View>
      <AdminOrderDetail orderId={detailId} close={()=>setDetailId(null)}/>
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách đơn hàng toàn chuỗi...</Text>
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
                  <Action label="Xem chi tiết / VAT" onPress={()=>setDetailId(item.id)}/>
                  <Text style={styles.orderDate}>{formatDateTime(item.created_at)}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{item.status_label || item.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.storeRow}>
                <Ionicons name="business" size={14} color={COLORS.purpleDark} />
                <Text style={styles.storeName}>Chi nhánh hiện tại: {item.store_name}</Text>
              </View>

              <Text style={styles.recipient}>
                Khách nhận: <Text style={styles.bold}>{item.receiver_name}</Text> ({item.receiver_phone})
              </Text>
              <Text style={styles.address}>Giao tới: {item.receiver_address}</Text>

              <View style={styles.footerRow}>
                <Text style={styles.total}>{formatVnd(item.total)}</Text>

                {['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(item.status) && (
                  <TouchableOpacity
                    style={styles.transferBtn}
                    onPress={() => handleOpenTransfer(item)}
                  >
                    <Ionicons name="swap-horizontal" size={14} color={COLORS.purpleDark} />
                    <Text style={styles.transferBtnText}>Điều chuyển đơn</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Transfer Store Modal */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ĐIỀU PHỐI ĐƠN HÀNG SANG CHI NHÁNH MỚI</Text>
            <Text style={styles.modalSub}>
              Đơn hàng: #{selectedOrder?.code} (Hiện tại: {selectedOrder?.store_name})
            </Text>

            <Text style={styles.selectLabel}>Chọn chi nhánh tiếp nhận:</Text>
            <FlatList
              data={stores.slice(0, 8)}
              keyExtractor={(s) => String(s.id)}
              style={styles.storeList}
              renderItem={({ item }) => {
                const isSelected = item.id === targetStoreId;
                return (
                  <TouchableOpacity
                    style={[styles.storeOption, isSelected && styles.storeOptionActive]}
                    onPress={() => setTargetStoreId(item.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={COLORS.purple}
                    />
                    <Text
                      style={[styles.storeOptionText, isSelected && styles.storeOptionTextActive]}
                    >
                      {item.name} ({item.district})
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setTransferModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.btnDisabled]}
                onPress={handleConfirmTransfer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>XÁC NHẬN CHUYỂN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  listContent: {   padding: 20, paddingBottom: 40, gap: 8 },
  orderCard: {
    backgroundColor: COLORS.card,
    
    
    marginBottom: 12,
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 14, fontWeight: '800', color: COLORS.purpleDark },
  orderDate: {  color: COLORS.muted, marginTop: 2 , fontSize: 12 },
  statusBadge: { backgroundColor: COLORS.purpleLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: {  fontWeight: '800', color: COLORS.purpleDark , fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  storeName: {  fontWeight: '700', color: COLORS.purpleDark , fontSize: 14 },
  recipient: {  color: COLORS.text, marginBottom: 2 , fontSize: 14 },
  address: {  color: COLORS.muted, marginBottom: 8 , fontSize: 12 },
  bold: { fontWeight: '700' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  total: { fontSize: 14, fontWeight: '900', color: COLORS.redSale },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    
    gap: 4, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  transferBtnText: {  fontWeight: '700', color: COLORS.purpleDark , fontSize: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12,  color: COLORS.muted , fontSize: 14 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: COLORS.white,   maxHeight: '80%' , borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3', maxWidth: 760, alignSelf: 'center' },
  modalTitle: {  fontWeight: '800', color: COLORS.purpleDark , fontSize: 14 },
  modalSub: {  color: COLORS.muted, marginTop: 4, marginBottom: 12 , fontSize: 12 },
  selectLabel: {  fontWeight: '700', color: COLORS.text, marginBottom: 8 , fontSize: 14 },
  storeList: { maxHeight: 220, marginBottom: 14 },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  storeOptionActive: { backgroundColor: COLORS.purpleLight },
  storeOptionText: {  color: COLORS.text , fontSize: 14 },
  storeOptionTextActive: { fontWeight: '700', color: COLORS.purpleDark },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  cancelBtnText: {  fontWeight: '700', color: COLORS.text , fontSize: 14 },
  confirmBtn: { flex: 2, backgroundColor: COLORS.purple, paddingVertical: 12,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 14 },
});
