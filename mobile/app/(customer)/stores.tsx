import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, TextInput, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import apiClient from '../../src/api/client';
import { useCartStore } from '../../src/store/useCartStore';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';
import { AppAlert as Alert } from '../../src/utils/alert';

export default function StoresScreen() {
  const router = useRouter();
  const { width, isMobile } = useBreakpoint();
  const { selectedStoreId, setSelectedStore } = useCartStore();
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState<any>(null);
  const [message, setMessage] = useState('');
  const { data: stores = [], isLoading, isError, refetch } = useQuery<any[]>({ queryKey: ['stores-list'], queryFn: async () => (await apiClient.get('/v1/stores')).data.data });
  const cities = [...new Set(stores.map(store => String(store.city)))];
  const cityStores = stores.filter(store => !city || store.city === city);
  const districts = [...new Set(cityStores.map(store => String(store.district || '')).filter(Boolean))];
  const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const visible = cityStores.filter(store => (!district || store.district === district) && normalized(`${store.name} ${store.address} ${store.district}`).includes(normalized(search.trim())));
  const selected = stores.find(store => store.id === selectedStoreId);
  const columns = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
  const choose = (store: any) => {
    setSelectedStore(store.id, `${store.name} (${store.district})`);
    setMessage(`Đã chọn ${store.name}. Đơn hàng sẽ được chuẩn bị tại chi nhánh này.`);
  };
  async function findNearest() {
    if (locating) return;
    setLocating(true); setMessage('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setMessage('Chưa có quyền vị trí. Bạn có thể tìm và chọn cửa hàng bằng tên hoặc khu vực bên dưới.'); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = (await apiClient.get('/v1/stores/nearest', { params: { lat: location.coords.latitude, lng: location.coords.longitude } })).data.data?.[0];
      if (result) setNearest(result);
      else setMessage('Chưa tìm được chi nhánh gần bạn. Hãy chọn khu vực bên dưới.');
    } catch { setMessage('Chưa xác định được vị trí. Hãy bật GPS hoặc chọn khu vực bên dưới.'); }
    finally { setLocating(false); }
  }
  const call = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`).catch(() => Alert.alert('Số điện thoại cửa hàng', phone));
  return <View style={s.page}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={[s.header, isMobile && s.headerMobile]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Trở về cửa hàng" onPress={() => router.canGoBack() ? router.back() : router.replace('/(customer)/(tabs)')} style={s.back}><Ionicons name="arrow-back" size={20} color="#183e32" /><Text style={s.backText}>Trở về cửa hàng</Text></TouchableOpacity>
        <Text style={s.brand}>VQ FRUIT <Text style={s.brandDetail}> / STORE LOCATOR</Text></Text>
      </View>
      <View style={[s.hero, isMobile && s.heroMobile]}>
        <View style={s.heroCopy}><Text style={s.eyebrow}>LUÔN GẦN BẠN HƠN</Text><Text style={[s.title, isMobile && s.titleMobile]}>Tìm một chút tươi lành,{ '\n' }ngay gần bạn.</Text><Text style={s.description}>Ghé cửa hàng để tự tay chọn những thức quả ngon, hoặc chọn chi nhánh chuẩn bị đơn hàng của bạn.</Text>
          <View style={s.heroStats}><Ionicons name="storefront-outline" size={18} color="#d9e6be" /><Text style={s.stats}>{stores.length || '…'} cửa hàng<Text style={s.statsMuted}> · {cities.length || '…'} thành phố · Một sự tận tâm</Text></Text></View>
        </View>
        <View style={[s.gpsPanel, isMobile && s.gpsPanelMobile]}><View style={s.gpsIcon}><Ionicons name="navigate-outline" size={27} color="#183e32" /></View><Text style={s.gpsTitle}>Chi nhánh gần bạn</Text><Text style={s.gpsText}>Cho phép truy cập vị trí để tìm cửa hàng thuận tiện nhất.</Text><TouchableOpacity accessibilityRole="button" disabled={locating} onPress={findNearest} style={[s.gpsButton, locating && { opacity: 0.6 }]}>{locating ? <ActivityIndicator color="#183e32" /> : <><Ionicons name="locate-outline" size={18} color="#183e32" /><Text style={s.gpsButtonText}>Tìm cửa hàng gần tôi</Text></>}</TouchableOpacity></View>
      </View>
      <View style={[s.content, isMobile && { padding: 20 }]}>
        <View style={[s.filterTop, isMobile && s.vertical]}><View><Text style={s.sectionTitle}>Bạn muốn ghé khu vực nào?</Text><Text style={s.muted}>Tìm chi nhánh phù hợp với lịch trình của bạn.</Text></View><View style={[s.search, focused && s.searchFocused, isMobile && { width: '100%' }]}><Ionicons name="search-outline" size={20} color="#70816b" /><TextInput accessibilityLabel="Tìm cửa hàng" placeholder="Tên cửa hàng, địa chỉ hoặc quận…" placeholderTextColor="#929b88" value={search} onChangeText={setSearch} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={s.input} />{!!search && <TouchableOpacity accessibilityLabel="Xóa tìm kiếm" style={s.clear} onPress={() => setSearch('')}><Ionicons name="close" size={18} color="#70816b" /></TouchableOpacity>}</View></View>
        <View style={s.cityTabs}>{['', ...cities].map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: city === value }} style={[s.cityTab, city === value && s.cityTabActive]} onPress={() => { setCity(value); setDistrict(''); }}><Text style={[s.cityText, city === value && s.cityTextActive]}>{value || 'Tất cả cửa hàng'}</Text><Text style={[s.cityCount, city === value && s.cityTextActive]}>{value ? stores.filter(store => store.city === value).length : stores.length}</Text></TouchableOpacity>)}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.districts}>{['', ...districts].map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: district === value }} style={[s.district, district === value && s.districtActive]} onPress={() => setDistrict(value)}><Text style={[s.districtText, district === value && { color: '#183e32' }]}>{value || 'Tất cả quận / huyện'}</Text></TouchableOpacity>)}</ScrollView>
        {!!message && <View style={s.notice}><Ionicons name="information-circle-outline" size={20} color="#365d3b" /><Text accessibilityLiveRegion="polite" style={s.noticeText}>{message}</Text><TouchableOpacity accessibilityLabel="Đóng thông báo" onPress={() => setMessage('')}><Ionicons name="close" size={18} color="#365d3b" /></TouchableOpacity></View>}
        {nearest && <View style={s.nearest}><Ionicons name="navigate-circle-outline" size={28} color="#183e32" /><View style={{ flex: 1 }}><Text style={s.cardName}>Gần bạn nhất: {nearest.name}</Text><Text style={s.muted}>Cách bạn {Number(nearest.distance_km).toFixed(1)} km · {nearest.address}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => choose(nearest)} style={s.smallButton}><Text style={s.smallButtonText}>Chọn</Text></TouchableOpacity></View>}
        <View style={s.resultsHeader}><Text style={s.muted}><Text style={s.resultNumber}>{visible.length}</Text> cửa hàng phù hợp</Text>{selected && <Text style={s.selectedSummary} numberOfLines={1}>Đang mua tại: {selected.name}</Text>}</View>
        {isLoading ? <View style={s.empty}><ActivityIndicator color="#183e32" /><Text style={s.muted}>Đang tìm những cửa hàng gần bạn…</Text></View> : isError ? <View style={s.empty}><Text style={s.cardName}>Chưa tải được danh sách cửa hàng</Text><TouchableOpacity onPress={() => refetch()} style={s.smallButton}><Text style={s.smallButtonText}>Thử lại</Text></TouchableOpacity></View> : !visible.length ? <View style={s.empty}><Ionicons name="search-outline" size={32} color="#849277" /><Text style={s.cardName}>Chưa có cửa hàng phù hợp</Text><Text style={s.muted}>Thử tên khác hoặc chọn lại khu vực.</Text><TouchableOpacity onPress={() => { setCity(''); setDistrict(''); setSearch(''); }}><Text style={s.reset}>Đặt lại bộ lọc</Text></TouchableOpacity></View> : <View style={s.grid}>{visible.map((store, index) => {
          const active = store.id === selectedStoreId;
          return <View key={store.id} style={[s.card, { width: columns === 3 ? '32%' : columns === 2 ? '49%' : '100%' }, active && s.cardActive]}>
            <View style={s.cardTop}><View style={[s.storeIcon, active && { backgroundColor: '#dce8cd' }]}><Ionicons name="storefront-outline" size={24} color="#365d3b" /></View><Text style={s.cardIndex}>{active ? 'ĐANG CHỌN' : String(index + 1).padStart(2, '0')}</Text></View>
            <Text style={s.cardLocation}>{store.district} · {store.city}</Text><Text style={s.cardName}>{store.name}</Text>
            <View style={s.info}><Ionicons name="location-outline" size={17} color="#7d8d73" /><Text style={s.infoText}>{store.address}</Text></View>
            <View style={s.info}><Ionicons name="time-outline" size={17} color="#7d8d73" /><Text style={s.infoText}>{store.open_hours || 'Liên hệ cửa hàng để biết giờ mở cửa'}</Text></View>
            {!!store.phone && <View style={s.info}><Ionicons name="call-outline" size={17} color="#7d8d73" /><Text style={s.infoText}>{store.phone}</Text></View>}
            <View style={s.actions}>{!!store.phone && <TouchableOpacity accessibilityLabel={`Gọi ${store.name}`} onPress={() => call(store.phone)} style={s.call}><Ionicons name="call-outline" size={18} color="#183e32" /></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => choose(store)} style={[s.choose, active && s.chooseActive]}><Text style={[s.chooseText, active && { color: '#365d3b' }]}>{active ? 'Chi nhánh đã chọn' : 'Chọn chi nhánh'}</Text><Ionicons name={active ? 'checkmark-circle-outline' : 'arrow-forward'} size={18} color={active ? '#365d3b' : '#fff'} /></TouchableOpacity></View>
          </View>;
        })}</View>}
        <View style={s.footer}><Ionicons name="leaf-outline" size={18} color="#7d8d73" /><Text style={s.footerText}>VQ FRUIT · Tươi ngon mỗi ngày, tận tâm ở từng chi nhánh.</Text></View>
      </View>
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: '#f7f6f0' }, scroll: { paddingBottom: 28 }, header: { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 }, headerMobile: { paddingHorizontal: 20, flexWrap: 'wrap' }, back: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }, backText: { color: '#53674b', fontSize: 13 }, brand: { color: '#183e32', fontSize: 18, fontWeight: '600', letterSpacing: 1.5 }, brandDetail: { fontSize: 8, color: '#8d977f', letterSpacing: 1.4 },
  hero: { width: '94%', maxWidth: 1256, alignSelf: 'center', backgroundColor: '#183e32', borderRadius: 22, padding: 40, flexDirection: 'row', gap: 40, alignItems: 'center' }, heroMobile: { padding: 25, flexDirection: 'column', alignItems: 'stretch', gap: 28 }, heroCopy: { flex: 1 }, eyebrow: { color: '#c5d5ac', fontSize: 10, letterSpacing: 2, marginBottom: 18 }, title: { fontSize: 38, lineHeight: 49, fontWeight: '600', color: '#fffdf2', letterSpacing: -0.7 }, titleMobile: { fontSize: 29, lineHeight: 39 }, description: { color: '#bdceba', fontSize: 14, lineHeight: 25, marginTop: 18, maxWidth: 510 }, heroStats: { marginTop: 26, flexDirection: 'row', gap: 10, alignItems: 'center' }, stats: { color: '#e1eccd', fontSize: 13, flex: 1, lineHeight: 22 }, statsMuted: { color: '#a6bea1', fontSize: 11 }, gpsPanel: { width: 290, backgroundColor: '#244b3c', padding: 24, borderRadius: 16 }, gpsPanelMobile: { width: '100%' }, gpsIcon: { width: 49, height: 49, borderRadius: 15, backgroundColor: '#e4ecd5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, gpsTitle: { color: '#f1f5e8', fontSize: 18, fontWeight: '600' }, gpsText: { color: '#b6c9b0', fontSize: 12, lineHeight: 21, marginTop: 9 }, gpsButton: { backgroundColor: '#e5edcf', padding: 14, borderRadius: 9, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20, minHeight: 48 }, gpsButtonText: { color: '#183e32', fontWeight: '600', fontSize: 12 },
  content: { width: '100%', maxWidth: 1320, alignSelf: 'center', padding: 32 }, filterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 22, marginTop: 10, marginBottom: 24 }, vertical: { flexDirection: 'column', alignItems: 'stretch' }, sectionTitle: { color: '#183e32', fontSize: 23, fontWeight: '600', marginBottom: 8 }, muted: { color: '#7c8872', fontSize: 13, lineHeight: 22 }, search: { width: 350, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: '#dce1d3', borderRadius: 10, backgroundColor: '#fffefa', paddingLeft: 15 }, searchFocused: { borderColor: '#64875a' }, input: { flex: 1, minWidth: 0, paddingVertical: 16, paddingRight: 8, fontSize: 14, color: '#183e32', ...Platform.select({ web: { outlineStyle: 'none' } as any }) }, clear: { padding: 12 }, cityTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, cityTab: { minHeight: 46, paddingHorizontal: 19, paddingVertical: 12, borderWidth: 1, borderColor: '#dce1d3', borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fffefa' }, cityTabActive: { backgroundColor: '#183e32', borderColor: '#183e32' }, cityText: { fontSize: 13, color: '#52664a' }, cityCount: { fontSize: 11, color: '#839176' }, cityTextActive: { color: '#f1f5e6' }, districts: { gap: 9, paddingVertical: 20 }, district: { borderRadius: 7, paddingVertical: 10, paddingHorizontal: 13, backgroundColor: '#eeeee5', borderWidth: 1, borderColor: 'transparent' }, districtActive: { borderColor: '#afbea0', backgroundColor: '#e5ebda' }, districtText: { color: '#7c8872', fontSize: 12 }, notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 10, backgroundColor: '#e6eddb', marginBottom: 18 }, noticeText: { flex: 1, color: '#365d3b', fontSize: 13, lineHeight: 22 }, nearest: { padding: 18, borderWidth: 1, borderColor: '#c5d3b5', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }, resultsHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingVertical: 14, borderTopWidth: 1, borderColor: '#e0e4d8', marginBottom: 12 }, resultNumber: { color: '#183e32', fontWeight: '600' }, selectedSummary: { color: '#7c8872', fontSize: 11, maxWidth: '90%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 }, card: { backgroundColor: '#fffefa', borderRadius: 15, padding: 23, borderWidth: 1, borderColor: '#e0e5d7' }, cardActive: { borderColor: '#789569', backgroundColor: '#f8fbf2' }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, storeIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#eef2e6', alignItems: 'center', justifyContent: 'center' }, cardIndex: { color: '#8b9b7d', fontSize: 10, letterSpacing: 1.2 }, cardLocation: { color: '#8a987e', fontSize: 10, letterSpacing: 0.5, marginBottom: 8 }, cardName: { color: '#183e32', fontSize: 17, lineHeight: 25, fontWeight: '600', marginBottom: 15 }, info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 11 }, infoText: { color: '#7c8872', fontSize: 12, lineHeight: 20, flex: 1 }, actions: { flexDirection: 'row', gap: 10, paddingTop: 18, marginTop: 'auto', borderTopWidth: 1, borderColor: '#e9ecdf' }, call: { width: 45, height: 45, borderWidth: 1, borderColor: '#dce3d1', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, choose: { flex: 1, minHeight: 45, backgroundColor: '#183e32', borderRadius: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, gap: 8 }, chooseActive: { backgroundColor: '#e4ecd7' }, chooseText: { color: '#fff', fontSize: 12, fontWeight: '600', flexShrink: 1 }, smallButton: { backgroundColor: '#183e32', borderRadius: 8, padding: 13 }, smallButtonText: { color: '#fff', fontSize: 13 }, empty: { alignItems: 'center', gap: 12, paddingVertical: 55 }, reset: { color: '#365d3b', padding: 12, textDecorationLine: 'underline' }, footer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 32, paddingTop: 22, borderTopWidth: 1, borderColor: '#e0e4d8' }, footerText: { color: '#8b987d', fontSize: 11, lineHeight: 20, flexShrink: 1 },
});
