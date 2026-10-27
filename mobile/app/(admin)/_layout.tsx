import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

const MENU = [
  { key: 'index', label: 'Tổng quan', icon: 'grid-outline', title: 'Tổng quan' },
  { key: 'orders', label: 'Đơn hàng', icon: 'receipt-outline', title: 'Quản lý đơn hàng' },
  { key: 'products', label: 'Sản phẩm', icon: 'nutrition-outline', title: 'Sản phẩm & giá bán' },
  { key: 'inventory', label: 'Kho hàng', icon: 'cube-outline', title: 'Điều phối tồn kho' },
  { key: 'stores', label: 'Chi nhánh', icon: 'storefront-outline', title: 'Hệ thống chi nhánh' },
  { key: 'users', label: 'Khách hàng & nhân sự', icon: 'people-outline', title: 'Tài khoản & phân quyền' },
  { key: 'marketing', label: 'Ưu đãi & quà tặng', icon: 'gift-outline', title: 'Marketing & thẻ quà tặng' },
  { key: 'approvals', label: 'Phê duyệt', icon: 'shield-checkmark-outline', title: 'Phê duyệt & đánh giá' },
] as const;
const DESCRIPTIONS: Record<string, string> = {
  orders: 'Theo dõi tiến độ, xử lý đơn hàng và điều phối giao nhận.',
  products: 'Quản lý danh mục sản phẩm, hình ảnh và giá từng quy cách.',
  inventory: 'Theo dõi tồn kho, nhập lô và luân chuyển giữa các chi nhánh.',
  stores: 'Quản lý hoạt động và theo dõi hiệu quả từng cửa hàng.',
  users: 'Quản lý khách hàng, nhân viên và quyền truy cập hệ thống.',
  marketing: 'Tạo chương trình ưu đãi và quản lý thẻ quà tặng.',
  approvals: 'Xử lý yêu cầu hoàn trả và kiểm duyệt đánh giá khách hàng.',
};
export default function AdminLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isDesktop } = useBreakpoint();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const active = MENU.some(item => item.key === segments[segments.length - 1]) ? segments[segments.length - 1] : 'index';
  useEffect(() => { if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) router.replace('/(auth)/login'); }, [user, isAuthenticated, isLoading]);
  if (!isAuthenticated || user?.role !== 'admin') return <View style={s.loading}><ActivityIndicator color="#183e32"/></View>;
  const links = MENU.map(item => <TouchableOpacity key={item.key} accessibilityRole="button" accessibilityState={{ selected: active === item.key }} onPress={() => router.push((item.key === 'index' ? '/(admin)' : `/(admin)/${item.key}`) as any)} style={[s.navLink, !isDesktop && s.mobileLink, active === item.key && s.navActive]}><Ionicons name={item.icon} size={19} color={active === item.key ? '#fff' : '#a9bdb3'}/><Text style={[s.navText, active === item.key && s.navTextActive]}>{item.label}</Text>{isDesktop && active === item.key && <View style={s.activeDot}/>}</TouchableOpacity>);
  return <View style={[s.shell, !isDesktop && { flexDirection: 'column' }]}>
    {isDesktop ? <View style={s.sidebar}>
      <View style={s.brand}><View style={s.brandIcon}><Ionicons name="leaf" size={23} color="#d5e7af"/></View><View><Text style={s.logo}>VQ FRUIT</Text><Text style={s.brandSub}>ADMIN WORKSPACE</Text></View></View>
      <Text style={s.section}>ĐIỀU HÀNH</Text><ScrollView style={{ flex: 1 }} contentContainerStyle={s.navigation} showsVerticalScrollIndicator={false}>{links}</ScrollView>
      <View style={s.sidebarBottom}><TouchableOpacity style={s.shopLink} onPress={() => router.push('/(customer)/(tabs)')}><Ionicons name="open-outline" size={17} color="#d5e7af"/><Text style={s.shopText}>Xem cửa hàng</Text></TouchableOpacity><View style={s.profile}><View style={s.avatar}><Text style={s.avatarText}>{user.fullName?.charAt(0) || 'A'}</Text></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={s.userName}>{user.fullName}</Text><Text style={s.userRole}>Quản trị viên</Text></View><TouchableOpacity accessibilityLabel="Đăng xuất" style={{ padding: 10 }} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}><Ionicons name="log-out-outline" size={19} color="#bdcfc5"/></TouchableOpacity></View></View>
    </View> : <View style={s.mobileNav}><View style={s.mobileBrand}><Text style={s.logo}>VQ FRUIT <Text style={s.brandSub}> / ADMIN</Text></Text><TouchableOpacity accessibilityLabel="Đăng xuất" style={{ padding: 10 }} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}><Ionicons name="log-out-outline" size={20} color="#fff"/></TouchableOpacity></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 10 }}>{links}</ScrollView></View>}
    <View style={s.main}>
      {active !== 'index' && <View style={[s.pageHeading, !isDesktop && { padding: 18 }]}>
        <Text style={s.breadcrumb}>KHÔNG GIAN QUẢN TRỊ / {MENU.find(item => item.key === active)?.label.toLocaleUpperCase('vi-VN')}</Text>
        <Text accessibilityRole="header" style={[s.pageTitle, !isDesktop && { fontSize: 24 }]}>{MENU.find(item => item.key === active)?.title}</Text>
        <Text style={s.pageDescription}>{DESCRIPTIONS[active]}</Text>
      </View>}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f3f6f5' } }}>{MENU.map(item => <Stack.Screen key={item.key} name={item.key} options={{ title: item.title }}/>)}</Stack>
    </View>
  </View>;
}
const s = StyleSheet.create({
  pageHeading: { paddingHorizontal: 28, paddingTop: 26, paddingBottom: 22, backgroundColor: '#f3f6f5', borderBottomWidth: 1, borderBottomColor: '#dfe8e3' },
  breadcrumb: { color: '#63786c', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 },
  pageTitle: { color: '#183e32', fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  pageDescription: { color: '#63786c', fontSize: 14, lineHeight: 22, marginTop: 8 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, shell: { flex: 1, flexDirection: 'row', backgroundColor: '#f4f6f3' }, main: { flex: 1, minWidth: 0, minHeight: 0 }, sidebar: { width: 244, backgroundColor: '#14392e', padding: 18 }, brand: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 10, paddingTop: 19, paddingBottom: 43 }, brandIcon: { width: 40, height: 40, backgroundColor: '#ffffff12', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, logo: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 1.8 }, brandSub: { color: '#87a699',  letterSpacing: 1.8, marginTop: 5 , fontSize: 12 }, section: {  letterSpacing: 1.6, color: '#6e9784', marginLeft: 14, marginBottom: 14 , fontSize: 12 }, navigation: { gap: 6 }, navLink: { minHeight: 48, paddingHorizontal: 14, borderRadius: 9, flexDirection: 'row', gap: 12, alignItems: 'center' }, navActive: { backgroundColor: '#2b5744' }, navText: { color: '#a9bdb3',  flex: 1 , fontSize: 14 }, navTextActive: { color: '#fff', fontWeight: '600' }, activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#d1e8a7' }, sidebarBottom: { marginTop: 'auto', paddingTop: 30 }, shopLink: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 15 }, shopText: { color: '#d5e7af',  fontSize: 14 }, profile: { flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderColor: '#ffffff16', paddingTop: 20, marginTop: 12 }, avatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#dbe9c9', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#183e32', fontWeight: '700' }, userName: { color: '#fff',  fontSize: 12 }, userRole: { color: '#87a699',  marginTop: 5 , fontSize: 12 }, mobileNav: { backgroundColor: '#14392e' }, mobileBrand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }, mobileLink: { paddingHorizontal: 12, minHeight: 42 },
});
