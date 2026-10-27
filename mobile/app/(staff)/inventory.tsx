import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import COLORS from '../../src/theme/colors';

export default function StaffInventoryScreen() {
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'waste'>('in');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [qtyInput, setQtyInput] = useState('5');
  const [noteInput, setNoteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [batchNo,setBatchNo]=useState('');
  const [expiryInput,setExpiryInput]=useState('');
  const [alertHours,setAlertHours]=useState(48);
  const {data:batches=[],refetch:refreshBatches}=useQuery<any[]>({queryKey:['inventory-batches',alertHours],queryFn:async()=>(await apiClient.get('/v1/staff/inventory/batches',{params:{hours:alertHours}})).data.data});

  const {
    data: inventory = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['staff-inventory'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/staff/inventory');
      return res.data?.data || [];
    },
  });

  const filteredItems = inventory.filter((item: any) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.product_name?.toLowerCase().includes(q);
      const matchVariant = item.variant_label?.toLowerCase().includes(q);
      if (!matchName && !matchVariant) return false;
    }
    if (filterMode === 'low') return item.qty > 0 && item.qty <= 10;
    if (filterMode === 'out') return item.qty <= 0;
    return true;
  });

  const handleOpenModal = (variant: any, type: 'in' | 'waste') => {
    setSelectedVariant(variant);
    setModalType(type);
    setQtyInput(type === 'in' ? '10' : '1');
    setNoteInput(type === 'in' ? 'Nhập bổ sung từ kho tổng' : 'Trái bị dập nát sau 2 ngày lưu kho');
    setStockModalVisible(true);
    setBatchNo('');setExpiryInput('');
  };

  const handleConfirmStock = async () => {
    const qty = parseInt(qtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số lượng hợp lệ lớn hơn 0');
      return;
    }
    const expiry=expiryInput?new Date(expiryInput.replace(' ','T')+':00+07:00'):null;
    if(modalType==='in'&&(!batchNo.trim()||!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(expiryInput)||!expiry||!Number.isFinite(expiry.getTime())||expiry.getTime()<=Date.now())){
      Alert.alert('Thiếu thông tin lô','Nhập mã lô và hạn dùng tương lai theo YYYY-MM-DD HH:mm (giờ Việt Nam).');return;
    }

    try {
      setSubmitting(true);
      if (modalType === 'in') {
        await apiClient.post('/v1/staff/inventory/adjust', {
          variantId: selectedVariant.variant_id,
          changeQty: qty,
          type: 'import',
          batchNo:batchNo.trim(),expiresAt:expiry!.toISOString(),
          reason: noteInput.trim(),
        });
        Alert.alert('Thành công', `Đã nhập thêm +${qty} sản phẩm vào kho.`);
      } else {
        await apiClient.post('/v1/staff/inventory/adjust', {
          variantId: selectedVariant.variant_id,
          changeQty: qty,
          type: 'waste',
          reason: noteInput.trim(),
        });
        Alert.alert('Thành công', `Đã ghi nhận hao hụt -${qty} sản phẩm.`);
      }
      setStockModalVisible(false);
      refetch();
      refreshBatches();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật kho');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search & Filter Header */}
      <View style={styles.headerCard}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm sản phẩm kiểm kê..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterBtn, filterMode === 'all' && styles.filterBtnActive]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterText, filterMode === 'all' && styles.filterTextActive]}>
              Tất cả ({inventory.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filterMode === 'low' && styles.filterBtnActive]}
            onPress={() => setFilterMode('low')}
          >
            <Text style={[styles.filterText, filterMode === 'low' && styles.filterTextActive]}>
              Sắp hết (≤10)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filterMode === 'out' && styles.filterBtnActive]}
            onPress={() => setFilterMode('out')}
          >
            <Text style={[styles.filterText, filterMode === 'out' && styles.filterTextActive]}>
              Hết hàng (0)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inventory List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách tồn kho...</Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={<View style={styles.headerCard}>
            <Text style={styles.modalTitle}>Lô hàng cận hạn / hết hạn ({batches.length})</Text>
            <View style={{flexDirection:'row',gap:12}}>{[24,48].map(hours=><TouchableOpacity key={hours} accessibilityRole="button" style={{padding:12,minHeight:48}} onPress={()=>setAlertHours(hours)}><Text style={{fontWeight:alertHours===hours?'800':'400'}}>Trong {hours} giờ</Text></TouchableOpacity>)}</View>
            {batches.length===0?<Text>Không có lô cận hạn trong khoảng đã chọn.</Text>:batches.slice(0,10).map(batch=><View key={batch.id} style={{paddingVertical:8}}>
              <Text style={{fontWeight:'700',color:batch.expiry_status==='expired'?COLORS.redSale:COLORS.text}}>{batch.product_name} · {batch.batch_no}</Text>
              <Text>{batch.qty} phần · {batch.expiry_status==='expired'?'ĐÃ HẾT HẠN':'Cận hạn'} · {new Date(batch.expires_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</Text>
            </View>)}
            {batches.length>10&&<Text>Còn {batches.length-10} lô cận hạn khác.</Text>}
            <Text style={{marginTop:8,color:COLORS.muted}}>Xuất FIFO theo ngày nhập. Lô hết hạn bị chặn khi bán.</Text>
          </View>}
          data={filteredItems}
          keyExtractor={(item) => String(item.variant_id || item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={()=>{refetch();refreshBatches();}} />}
          renderItem={({ item }) => {
            const isLow = item.qty > 0 && item.qty <= 10;
            const isOut = item.qty <= 0;

            return (
              <View style={styles.itemCard}>
                <View style={styles.cardInfo}>
                  <Text style={styles.prodName}>{item.product_name}</Text>
                  <Text style={styles.variantName}>Quy cách: {item.variant_label}</Text>
                  <Text style={styles.skuText}>SKU: {item.sku || 'KLEVER-SKU'}</Text>
                </View>

                <View style={styles.stockCol}>
                  <Text
                    style={[
                      styles.stockQty,
                      isOut ? { color: COLORS.redSale } : isLow ? { color: COLORS.goldDark } : { color: COLORS.greenCheck },
                    ]}
                  >
                    {item.qty} {item.unit || 'phần'}
                  </Text>
                  <Text style={styles.stockStatus}>
                    {isOut ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Có sẵn'}
                  </Text>
                </View>

                <View style={styles.actionCol}>
                  <TouchableOpacity
                    style={styles.stockInBtn}
                    onPress={() => handleOpenModal(item, 'in')}
                  >
                    <Ionicons name="add-circle" size={16} color={COLORS.purpleDark} />
                    <Text style={styles.stockInBtnText}>Nhập</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.wasteBtn}
                    onPress={() => handleOpenModal(item, 'waste')}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.redSale} />
                    <Text style={styles.wasteBtnText}>Báo hỏng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Stock In / Waste Modal */}
      <Modal visible={stockModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalType === 'in' ? '📥 NHẬP HÀNG BỔ SUNG VÀO KHO' : '🗑 BÁO HỎNG & HAO HỤT TRÁI CÂY'}
            </Text>
            <Text style={styles.modalSub}>
              {selectedVariant?.product_name} ({selectedVariant?.variant_label})
            </Text>

            <View style={styles.modalInputGroup}>
              {modalType==='in'&&<>
                <Text style={styles.modalLabel}>Mã lô nhập</Text>
                <TextInput accessibilityLabel="Mã lô nhập" style={styles.modalInput} value={batchNo} onChangeText={setBatchNo} placeholder="VD: CHERRY-20261023-A"/>
                <Text style={styles.modalLabel}>Hạn dùng · YYYY-MM-DD HH:mm (giờ Việt Nam)</Text>
                <TextInput accessibilityLabel="Hạn dùng lô hàng" style={styles.modalInput} value={expiryInput} onChangeText={setExpiryInput} placeholder="2026-10-25 18:00"/>
              </>}
              <Text style={styles.modalLabel}>Số lượng ({selectedVariant?.unit || 'phần'}):</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                value={qtyInput}
                onChangeText={setQtyInput}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>
                {modalType === 'in' ? 'Ghi chú / Nguồn nhập:' : 'Lý do báo hỏng / dập nát:'}
              </Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                multiline
                value={noteInput}
                onChangeText={setNoteInput}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setStockModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmModalBtn,
                  { backgroundColor: modalType === 'in' ? COLORS.purple : COLORS.redSale },
                  submitting && { opacity: 0.6 },
                ]}
                onPress={handleConfirmStock}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmModalText}>
                    {modalType === 'in' ? 'XÁC NHẬN NHẬP' : 'XÁC NHẬN BÁO HỎNG'}
                  </Text>
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
  headerCard: { backgroundColor: COLORS.white, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 10,
  },
  filterTabs: { flexDirection: 'row', gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.inputBg, alignItems: 'center' },
  filterBtnActive: { backgroundColor: COLORS.purpleLight, borderWidth: 1, borderColor: COLORS.purple },
  filterText: { fontSize: 11, color: COLORS.muted, fontWeight: '600' },
  filterTextActive: { color: COLORS.purpleDark, fontWeight: '700' },
  listContent: { padding: 14, paddingBottom: 30 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardInfo: { flex: 1 },
  prodName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  variantName: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  skuText: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  stockCol: { alignItems: 'flex-end', marginHorizontal: 12 },
  stockQty: { fontSize: 15, fontWeight: '900' },
  stockStatus: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  actionCol: { gap: 6 },
  stockInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  stockInBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.purpleDark },
  wasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  wasteBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.redSale },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 14, padding: 18 },
  modalTitle: { fontSize: 13, fontWeight: '800', color: COLORS.purpleDark },
  modalSub: { fontSize: 12, color: COLORS.muted, marginTop: 4, marginBottom: 14 },
  modalInputGroup: { marginBottom: 12 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  modalInput: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  confirmModalBtn: { flex: 2, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmModalText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
});
