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
  TextInput,
  
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import COLORS from '../../src/theme/admin';
import {StockReceiver,Choices,Field,Action} from '../../src/components/AdminControls';

export default function AdminInventoryScreen() {
  const [filterStore,setFilterStore]=useState(0),[search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [fromStoreId, setFromStoreId] = useState<number>(1);
  const [toStoreId, setToStoreId] = useState<number>(2);
  const [transferQty, setTransferQty] = useState('10');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch low stock / inventory warnings
  const {
    data: inventoryResponse,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-inventory-overview',filterStore,search,page],
    queryFn: async () => {
      const res = await apiClient.get('/v1/admin/inventory/overview',{params:{store_id:filterStore||undefined,search:search.trim()||undefined,page,limit:100}});
      return res.data;
    },
  });

  // Fetch 22 stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores-list-for-inv'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/admin/stores');
      return res.data?.data || [];
    },
  });

  const handleOpenTransfer = (item: any) => {
    setSelectedProduct(item);
    setFromStoreId(item.store_id);
    setToStoreId(stores.find((s:any)=>s.id!==item.store_id&&s.is_active)?.id||0);
    setTransferModalVisible(true);
  };

  const handleConfirmTransfer = async () => {
    const qty = parseInt(transferQty, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số lượng hợp lệ');
      return;
    }
    if (fromStoreId === toStoreId) {
      Alert.alert('Thông báo', 'Kho xuất và kho nhập phải là hai chi nhánh khác nhau');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/v1/admin/inventory/transfer', {
        variant_id: selectedProduct?.variant_id || selectedProduct?.id,
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        quantity: qty,
        note: note.trim() || 'Điều phối cân bằng tồn kho toàn hệ thống',
      });

      Alert.alert('Thành công! 📦', `Đã tạo lệnh điều chuyển ${qty} đơn vị hàng hóa sang chi nhánh mới.`);
      setTransferModalVisible(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể điều chuyển kho');
    } finally {
      setSubmitting(false);
    }
  };

  const inventory=inventoryResponse?.data||[];
  const totalPages=Math.max(1,inventoryResponse?.pagination?.totalPages||1);
  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <StockReceiver onSaved={()=>refetch()}/>
        <Text>Kho chi nhánh</Text><Choices value={filterStore} options={[{id:0,name:'Tất cả'},...stores.map((s:any)=>({id:s.id,name:s.name}))]} onSelect={id=>{setFilterStore(id);setPage(1);}}/>
        <Field label="Tìm tên sản phẩm / SKU" value={search} onChangeText={value=>{setSearch(value);setPage(1);}}/>
        <Text style={styles.headerTitle}>ĐIỀU PHỐI TỒN KHO LIÊN CHI NHÁNH</Text>
        <Text style={styles.headerSub}>Theo dõi số lượng tồn kho và điều chuyển linh hoạt giữa 22 điểm bán</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải dữ liệu tồn kho...</Text>
        </View>
      ) : (
        <FlatList
          ListFooterComponent={<View style={{padding:16}}><Text>Trang {page}/{totalPages} · {inventoryResponse?.pagination?.total||0} dòng tồn kho</Text><Action label="Trang trước" disabled={page<=1} onPress={()=>setPage(p=>p-1)}/><Action label="Trang sau" disabled={page>=totalPages} onPress={()=>setPage(p=>p+1)}/></View>}
          data={inventory}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{item.product_name}</Text>
                  <Text style={styles.variantName}>{item.variant_name || 'Tiêu chuẩn'}</Text>
                </View>

                <View style={[styles.stockBadge, item.quantity < 10 ? styles.stockLow : styles.stockNormal]}>
                  <Text style={[styles.stockText, item.quantity < 10 ? styles.stockTextLow : styles.stockTextNormal]}>
                    Tồn: {item.quantity} {item.unit || 'kg'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.storeRow}>
                <Ionicons name="business-outline" size={14} color={COLORS.muted} />
                <Text style={styles.storeName}>Điểm bán: {item.store_name || 'Chi nhánh VQ FRUIT'}</Text>
              </View>

              <TouchableOpacity
                style={styles.transferBtn}
                onPress={() => handleOpenTransfer(item)}
              >
                <Ionicons name="swap-horizontal" size={16} color={COLORS.white} />
                <Text style={styles.transferBtnText}>Điều Chuyển Sang Chi Nhánh Khác</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Transfer Modal */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>LỆNH ĐIỀU CHUYỂN HÀNG HÓA NỘI BỘ</Text>
            <Text style={styles.modalSub}>{selectedProduct?.product_name}</Text>

            <Text style={styles.inputLabel}>Chi nhánh xuất hàng (Từ kho):</Text>
            <View style={styles.pickerBox}>
              <Text style={styles.pickerText}>
                {stores.find((s: any) => s.id === fromStoreId)?.name || 'Chi nhánh xuất'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Chi nhánh nhận hàng (Đến kho):</Text>
            <FlatList
              data={stores.slice(0, 6)}
              keyExtractor={(s) => String(s.id)}
              style={{ maxHeight: 150, marginBottom: 10 }}
              renderItem={({ item }) => {
                const isSelected = item.id === toStoreId;
                return (
                  <TouchableOpacity
                    style={[styles.storeOption, isSelected && styles.storeOptionActive]}
                    onPress={() => setToStoreId(item.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={COLORS.purple}
                    />
                    <Text style={[styles.storeOptionText, isSelected && styles.storeOptionTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <Text style={styles.inputLabel}>Số lượng điều chuyển:</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={transferQty}
              onChangeText={setTransferQty}
              placeholder="10"
            />

            <Text style={styles.inputLabel}>Ghi chú điều động:</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Lý do điều chuyển..."
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
                  <Text style={styles.confirmBtnText}>XÁC NHẬN ĐIỀU ĐỘNG</Text>
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
  headerBar: {     padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dfe8e3', gap: 10 },
  headerTitle: {  fontWeight: '800', color: COLORS.purpleDark , fontSize: 14 },
  headerSub: {  color: COLORS.muted, marginTop: 2 , fontSize: 12 },
  listContent: {   padding: 20, paddingBottom: 40, gap: 8 },
  card: {
    backgroundColor: COLORS.card,
    
    
    marginBottom: 10,
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  prodName: {  fontWeight: '800', color: COLORS.text , fontSize: 14 },
  variantName: {  color: COLORS.muted, marginTop: 2 , fontSize: 12 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockNormal: { backgroundColor: '#DCFCE7' },
  stockLow: { backgroundColor: '#FEE2E2' },
  stockText: {  fontWeight: '800' , fontSize: 12 },
  stockTextNormal: { color: COLORS.greenCheck },
  stockTextLow: { color: COLORS.redSale },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  storeName: {  color: COLORS.muted , fontSize: 12 },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    
    backgroundColor: COLORS.purple,
    paddingVertical: 9,
    
    gap: 6, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  transferBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 14 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12,  color: COLORS.muted , fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: COLORS.white,   maxHeight: '85%' , borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3', maxWidth: 760, alignSelf: 'center' },
  modalTitle: {  fontWeight: '800', color: COLORS.purpleDark , fontSize: 14 },
  modalSub: {  color: COLORS.muted, marginTop: 4, marginBottom: 12 , fontSize: 12 },
  inputLabel: {  fontWeight: '700', color: COLORS.text, marginBottom: 4, marginTop: 6 , fontSize: 12 },
  input: {
    
    
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 9,
    
    color: COLORS.text, minHeight: 48, borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#f8faf9', fontSize: 14 },
  pickerBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerText: {  fontWeight: '700', color: COLORS.purpleDark , fontSize: 14 },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  storeOptionActive: { backgroundColor: COLORS.purpleLight },
  storeOptionText: {  color: COLORS.text , fontSize: 12 },
  storeOptionTextActive: { fontWeight: '700', color: COLORS.purpleDark },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  cancelBtnText: {  fontWeight: '700', color: COLORS.text , fontSize: 14 },
  confirmBtn: { flex: 2, backgroundColor: COLORS.purple, paddingVertical: 12,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  btnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 14 },
});
