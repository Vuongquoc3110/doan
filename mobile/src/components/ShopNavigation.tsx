import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useCartStore } from '../store/useCartStore';
import COLORS from '../theme/colors';

// The navigation uses the project's own categories and collections.
export default function ShopNavigation({ branded = false }: { branded?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const store = useCartStore(s => s.selectedStoreName);
  const totalItems = useCartStore(s => s.totalItems);
  const { isMobile } = useBreakpoint();
  const { data: categories = [], isError: categoryError, refetch: retryCategories } = useQuery<any[]>({ queryKey: ['categories-catalog'], queryFn: async () => (await apiClient.get('/v1/categories')).data.data });
  const { data: collections = [], isError: collectionError, refetch: retryCollections } = useQuery<any[]>({ queryKey: ['collections'], queryFn: async () => (await apiClient.get('/v1/collections')).data.data });
  const go = (path: any, params?: any) => { setOpen(false); router.push(params ? { pathname: path, params } : path); };
  const catalog = '/(customer)/(tabs)/categories';
  const link = (label: string, action: () => void) => <TouchableOpacity key={label} accessibilityRole="button" style={s.link} onPress={action}><Text style={s.text}>{label}</Text></TouchableOpacity>;
  return <View>
    {branded ? <View style={s.brandSurface}><View style={[s.brandHeader, isMobile && s.brandHeaderMobile]}>
      <TouchableOpacity accessibilityLabel="VQ FRUIT · Trang chủ" onPress={() => go('/(customer)/(tabs)')}><Text style={s.brandLogo}>VQ FRUIT</Text><Text style={s.tagline}>FRESHNESS, REFINED.</Text></TouchableOpacity>
      {!isMobile && <View style={s.brandLinks}>{link('Trái cây & quà tặng', () => setOpen(true))}{link('Cửa hàng', () => go('/(customer)/stores'))}{link('Cẩm nang', () => go('/(customer)/articles'))}{link('Hỗ trợ', () => go('/(customer)/feedback'))}</View>}
      <View style={s.brandActions}><TouchableOpacity accessibilityLabel="Tài khoản" style={s.iconButton} onPress={() => go('/(customer)/(tabs)/account')}><Ionicons name="person-outline" size={20} color={COLORS.primary}/></TouchableOpacity><TouchableOpacity accessibilityLabel={`Giỏ hàng, ${totalItems} sản phẩm`} style={s.cartButton} onPress={() => go('/(customer)/(tabs)/cart')}><Ionicons name="bag-handle-outline" size={20} color={COLORS.primary}/>{!isMobile && <Text style={s.text}>Giỏ hàng</Text>}<Text style={s.cartCount}>{totalItems}</Text></TouchableOpacity></View>
    </View><View style={s.locationBar}><TouchableOpacity style={s.locationInner} onPress={() => go('/(customer)/stores')}><Ionicons name="location-outline" size={14} color="#7b8276"/><Text style={s.locationText} numberOfLines={1}>Giao từ: {store}</Text><Text style={s.locationChange}>Thay đổi ↗</Text></TouchableOpacity>{!isMobile && <Text style={s.locationText}>Từ thiên nhiên · Đến bạn</Text>}</View></View> : <ScrollView horizontal style={s.barSurface} showsHorizontalScrollIndicator={false} contentContainerStyle={s.bar}>
      {link('☰ Danh mục & quà tặng', () => setOpen(true))}
      {link(`⌖ ${store} · Đổi`, () => go('/(customer)/stores'))}
      {link('Cẩm nang', () => go('/(customer)/articles'))}
      {link('Góp ý & hỗ trợ', () => go('/(customer)/feedback'))}
    </ScrollView>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}><View style={s.panel}>
        <View style={s.row}><Text style={s.heading}>Khám phá VQ FRUIT</Text>{link('Đóng ✕', () => setOpen(false))}</View>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {link('Xem tất cả sản phẩm →', () => go(catalog, { category_id: '', collection_slug: '', search: '', gift: '' }))}
          <Text style={s.heading}>Bộ sưu tập & dịp tặng</Text>
          {link('Tất cả quà tặng', () => go(catalog, { gift: '1', collection_slug: '', category_id: '', search: '' }))}
          {collections.map(c => link(c.name, () => go(catalog, { collection_slug: c.slug, category_id: '', search: '', gift: '' })))}
          <Text style={s.heading}>Danh mục sản phẩm</Text>
          {categories.map(c => link(`${c.name} (${c.product_count})`, () => go(catalog, { category_id: String(c.id), collection_slug: '', search: '', gift: '' })))}
          {(categoryError || collectionError) && link('Chưa tải được danh mục · Thử lại', () => { retryCategories(); retryCollections(); })}
          <Text style={s.heading}>Dịch vụ & thông tin</Text>
          {link('Hệ thống cửa hàng', () => go('/(customer)/stores'))}
          {link('Đổi trả & bảo hành', () => go('/(customer)/policy'))}
          {link('Mã giảm giá & thẻ quà tặng', () => go('/(customer)/vouchers'))}
          {link('Đơn hàng của tôi', () => go('/(customer)/orders'))}
          {link('Tuyển dụng', () => go('/(customer)/recruitment'))}
          {link('Góp ý chất lượng', () => go('/(customer)/feedback'))}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  barSurface: { backgroundColor: COLORS.primaryLight }, bar: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 6, gap: 10, backgroundColor: COLORS.primaryLight },
  brandSurface: { backgroundColor: '#fffefa', borderBottomWidth: 1, borderColor: '#e1e4d8' }, brandHeader: { minHeight: 100, paddingVertical: 20, paddingHorizontal: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20, width: '100%', maxWidth: 1584, alignSelf: 'center' }, brandHeaderMobile: { paddingHorizontal: 20, minHeight: 88, gap: 10 }, brandLogo: { fontFamily: Platform.select({ web: '"Times New Roman", serif', default: 'serif' }), color: COLORS.primary, fontSize: 28, letterSpacing: 2.8 }, tagline: { color: '#8a794b', fontSize: 7, letterSpacing: 2.4, marginTop: 5 }, brandLinks: { flexDirection: 'row', alignItems: 'center', gap: 4 }, brandActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, iconButton: { padding: 12 }, cartButton: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderColor: '#dce1d2', padding: 12, borderRadius: 24 }, cartCount: { fontSize: 11, color: COLORS.primary }, locationBar: { backgroundColor: '#f0f2e8', paddingHorizontal: 24, minHeight: 34, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }, locationInner: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }, locationText: { color: '#7b8276', fontSize: 10, flexShrink: 1 }, locationChange: { color: COLORS.primary, fontSize: 10 },
  link: { paddingHorizontal: 12, paddingVertical: 14 }, text: { color: COLORS.text, fontSize: 12, lineHeight: 20 },
  heading: { fontSize: 17, fontWeight: '700', color: COLORS.primary, marginTop: 18, marginHorizontal: 12, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: '#0007', justifyContent: 'center', alignItems: 'center', padding: 20 },
  panel: { backgroundColor: COLORS.bg, borderRadius: 14, maxHeight: '90%', width: '100%', maxWidth: 700, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
