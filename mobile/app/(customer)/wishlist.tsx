import {AppAlert as Alert} from '../../src/utils/alert';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useCartStore } from '../../src/store/useCartStore';
import { formatVnd } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';
import { resolveMediaUrl } from '../../src/utils/media';

export default function WishlistScreen() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const { data: wishlist = [], isLoading, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/me/wishlist');
      return res.data?.data || [];
    },
  });

  const handleRemove = async (productId: number) => {
    try {
      await apiClient.post(`/v1/me/wishlist/${productId}`);
      refetch();
    } catch {
      Alert.alert('Lỗi', 'Không thể xóa khỏi yêu thích');
    }
  };

  const handleAddToCart = async (product: any) => {
    try {
      const detail = (await apiClient.get(`/v1/products/${product.id}`)).data.data;
      if (detail.variants?.length !== 1) { router.push(`/(customer)/product/${product.id}`); return; }
      await addItem(detail.variants[0].id, 1);
      Alert.alert('Thành công', `Đã thêm "${product.name}" vào giỏ hàng.`);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm sản phẩm');
    }
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách yêu thích...</Text>
        </View>
      ) : wishlist.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>💖</Text>
          <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
          <Text style={styles.emptyDesc}>
            Hãy bấm vào biểu tượng trái tim ở từng sản phẩm để lưu lại những món trái cây bạn quan tâm!
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(customer)/(tabs)/categories')}
          >
            <Text style={styles.browseBtnText}>Khám Phá Sản Phẩm Ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => String(item.product_id || item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{
                  uri: resolveMediaUrl(item.thumbnail),
                }}
                style={styles.thumb}
              />
              <View style={styles.details}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.origin}>Xuất xứ: {item.origin || 'Nhập khẩu'}</Text>
                <Text style={styles.price}>{formatVnd(item.base_price)}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.addCartBtn}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Ionicons name="cart-outline" size={14} color={COLORS.white} />
                    <Text style={styles.addCartText}>Thêm vào giỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemove(item.product_id || item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.redSale} />
                  </TouchableOpacity>
                </View>
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
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  details: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  name: { fontSize: 13, fontWeight: '700', color: COLORS.text, lineHeight: 18 },
  origin: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '900', color: COLORS.redSale, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  addCartBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.purple,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addCartText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  removeBtn: { padding: 6 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  browseBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  browseBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
