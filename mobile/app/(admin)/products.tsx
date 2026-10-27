import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  
  Image,
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd } from '../../src/utils/format';
import { resolveMediaUrl } from '../../src/utils/media';
import COLORS from '../../src/theme/admin';
import {ProductCreator,VariantEditor} from '../../src/components/AdminControls';

export default function AdminProductsScreen() {
  const [search, setSearch] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [priceInput, setPriceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    data: products = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-products', search],
    queryFn: async () => {
      const res = await apiClient.get('/v1/admin/products', {
        params: { search: search.trim() || undefined, limit: 50 },
      });
      return res.data?.data || [];
    },
  });

  const handleOpenEdit = (product: any) => {
    setSelectedProduct(product);
    setPriceInput(String(product.base_price || ''));
    setEditModalVisible(true);
  };

  const handleSavePrice = async () => {
    const newPrice = Number(priceInput);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập giá bán hợp lệ');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.put(`/v1/admin/products/${selectedProduct.id}`, {
        base_price: newPrice,
      });
      Alert.alert('Thành công', `Đã cập nhật giá bán mới: ${formatVnd(newPrice)}`);
      setEditModalVisible(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể cập nhật giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <ProductCreator onSaved={()=>refetch()}/>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm sản phẩm theo tên..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Products list */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh mục sản phẩm...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Image
                source={{
                  uri: resolveMediaUrl(item.thumbnail),
                }}
                style={styles.thumb}
              />
              <View style={styles.details}>
                <Text style={styles.categoryText}>{item.category_name || 'Trái cây'}</Text>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.origin}>Xuất xứ: {item.origin || 'Nhập khẩu'}</Text>
                <Text style={styles.price}>{formatVnd(item.base_price)}</Text>
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleOpenEdit(item)}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.purpleDark} />
                <Text style={styles.editBtnText}>Sửa giá</Text>
              </TouchableOpacity>
              <VariantEditor productId={item.id} onSaved={()=>refetch()}/>
            </View>
          )}
        />
      )}

      {/* Edit Price Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ĐIỀU CHỈNH GIÁ BÁN SẢN PHẨM</Text>
            <Text style={styles.modalSub}>{selectedProduct?.name}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Giá bán mới (VNĐ):</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="number-pad"
                value={priceInput}
                onChangeText={setPriceInput}
                placeholder="Ví dụ: 1250000"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.btnDisabled]}
                onPress={handleSavePrice}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>LƯU GIÁ MỚI</Text>
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
  header: {     padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dfe8e3', gap: 10 },
  searchInput: {
    
    
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    
    color: COLORS.text, minHeight: 48, borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#f8faf9', fontSize: 14 },
  listContent: {   padding: 20, paddingBottom: 40, gap: 8 },
  productCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    
    
    marginBottom: 10,
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 12 },
  details: { flex: 1, minWidth: 160, justifyContent: 'space-between' },
  categoryText: {  color: COLORS.purple, fontWeight: '700' , fontSize: 12 },
  name: {  fontWeight: '700', color: COLORS.text,  fontSize: 14, lineHeight: 22 },
  origin: {  color: COLORS.muted, marginTop: 2 , fontSize: 12 },
  price: { fontSize: 14, fontWeight: '900', color: COLORS.redSale, marginTop: 4 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    
    gap: 4, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  editBtnText: {  fontWeight: '700', color: COLORS.purpleDark , fontSize: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12,  color: COLORS.muted , fontSize: 14 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { width: '100%', backgroundColor: COLORS.white,   borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3', maxWidth: 760, alignSelf: 'center' },
  modalTitle: {  fontWeight: '800', color: COLORS.purpleDark , fontSize: 14 },
  modalSub: {  color: COLORS.muted, marginTop: 4, marginBottom: 16 , fontSize: 14 },
  inputGroup: { marginBottom: 16 },
  inputLabel: {  fontWeight: '600', color: COLORS.text, marginBottom: 6 , fontSize: 14 },
  priceInput: {
    
    
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.redSale, minHeight: 48, borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#f8faf9' },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  cancelBtnText: {  fontWeight: '700', color: COLORS.text , fontSize: 14 },
  saveBtn: { flex: 2, backgroundColor: COLORS.purple, paddingVertical: 12,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 14 },
});
