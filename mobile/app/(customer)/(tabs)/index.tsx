import {CampaignBanners} from '../../../src/components/CampaignBanners';
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/api/client';
import { useCartStore } from '../../../src/store/useCartStore';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { formatVnd } from '../../../src/utils/format';
import { resolveMediaUrl, PLACEHOLDER_PRODUCT_IMAGE } from '../../../src/utils/media';
import { useBreakpoint } from '../../../src/hooks/useBreakpoint';
import ShopNavigation from '../../../src/components/ShopNavigation';
import CollectionsShowcase from '../../../src/components/CollectionsShowcase';
import AnimatedFruitBanner from '../../../src/components/AnimatedFruitBanner';

const GREEN = '#183e32', CREAM = '#f7f5ef', GOLD = '#b78a46', MUTED = '#73776e';
// Keep Vietnamese letters and their accents in one font on Windows.
// Georgia can fall back to a different face for Vietnamese glyphs.
const serif = Platform.select({ web: '"Times New Roman", "Noto Serif", serif', ios: 'Georgia', default: 'serif' });
interface Product { id: number; name: string; origin?: string; base_price: number; thumbnail?: string; sale_label?: string; is_gift?: boolean | number; }
const FILTERS = ['Tất cả', 'Trái cây nhập khẩu', 'Trái cây Việt', 'Hộp quà'];
function FruitImage({ uri, style, label, fit = 'cover' }: { uri: string; style: any; label: string; fit?: 'cover' | 'contain' }) {
  const [failed, setFailed] = useState(false);
  return <Image accessibilityLabel={label} source={{ uri: failed ? PLACEHOLDER_PRODUCT_IMAGE : uri }} onError={() => setFailed(true)} style={style} resizeMode={fit} />;
}
export default function HomeScreen() {
  const router = useRouter();
  const { isMobile, isDesktop } = useBreakpoint();
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const sectionY = useRef(0);
  const storyY = useRef(0);
  const { addItem, totalItems, selectedStoreName } = useCartStore();
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const [filter, setFilter] = useState(0);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: products = [], isLoading, isError, refetch } = useQuery<Product[]>({
    queryKey: ['vq-home-products'],
    queryFn: async () => (await apiClient.get('/v1/products', { params: { limit: 100 } })).data?.data || [],
  });
  const { data: articles = [] } = useQuery<any[]>({
    queryKey: ['articles-preview'],
    queryFn: async () => (await apiClient.get('/v1/articles', { params: { limit: 3 } })).data?.data || [],
  });
  const catalog = () => router.push('/(customer)/(tabs)/categories');
  const collection = (selected = 0) => { setFilter(selected); scroll.current?.scrollTo({ y: sectionY.current, animated: true }); };
  const add = async (p: Product) => {
    if (submitting) return;
    if (!authenticated) { router.push('/(auth)/login'); return; }
    setSubmitting(true); setAdding(p.id); setMessage('');
    try {
      // Danh sách API không có variant_id: lấy biến thể thật, không dùng product.id thay thế.
      const detail = (await apiClient.get(`/v1/products/${p.id}`)).data?.data;
      const variants = detail?.variants || [];
      if (variants.length !== 1) { router.push(`/(customer)/product/${p.id}`); return; }
      await addItem(variants[0].id, 1);
      setMessage(`Đã thêm ${p.name} vào giỏ hàng.`);
    } catch (error: any) { setMessage(error.response?.data?.message || 'Chưa thể thêm sản phẩm. Vui lòng thử lại.'); }
    finally { setSubmitting(false); setAdding(null); }
  };
  const visible = products.filter(p => {
    const local = /việt|viet/i.test(p.origin || '');
    if (filter === 1) return !p.is_gift && !!p.origin && !local;
    if (filter === 2) return !p.is_gift && local;
    if (filter === 3) return !!p.is_gift;
    return true;
  }).slice(0, 8);
  return <ScrollView ref={scroll} style={s.page} contentContainerStyle={{ paddingBottom: 16 }}>
    <View style={s.announcement}><Text style={s.announcementText}>VQ FRUIT · MỘT CHÚT TƯƠI LÀNH, MỘT NGÀY TRỌN VẸN</Text></View>
    <View style={[s.header, isMobile && s.mobilePadding]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Về đầu trang" onPress={() => scroll.current?.scrollTo({ y: 0 })}><Text style={s.logo}>VQ FRUIT</Text><Text style={s.slogan}>FRESHNESS, REFINED.</Text></TouchableOpacity>
      {!isMobile && <View style={s.nav}><TouchableOpacity onPress={() => collection()}><Text style={s.navText}>Trái cây</Text></TouchableOpacity><TouchableOpacity onPress={() => collection(3)}><Text style={s.navText}>Quà tặng</Text></TouchableOpacity><TouchableOpacity onPress={() => scroll.current?.scrollTo({ y: storyY.current, animated: true })}><Text style={s.navText}>Câu chuyện VQ</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/(customer)/(tabs)/account')}><Text style={s.navText}>Tài khoản</Text></TouchableOpacity></View>}
      <TouchableOpacity style={s.cartButton} onPress={() => router.push('/(customer)/(tabs)/cart')} accessibilityRole="button"><Text style={s.navText}>Giỏ hàng ({totalItems}) ↗</Text></TouchableOpacity>
    </View>
    <ShopNavigation />
    <View style={[s.hero, isMobile && s.vertical]}>
      <View style={[s.heroCopy, isMobile && s.heroCopyMobile]}><Text style={s.eyebrow}>TỪ THIÊN NHIÊN · ĐẾN BẠN</Text><Text style={[s.title, { fontSize: isDesktop ? 54 : 38, lineHeight: isDesktop ? 66 : 49 }]}>Vị ngon thuần khiết.{'\n'}<Text style={s.italic}>Trọn từng khoảnh khắc.</Text></Text><Text style={s.description}>Khám phá những thức quả tươi ngon và những món quà tinh tế. Một lựa chọn nhỏ, để mỗi ngày thêm ngọt lành.</Text><TouchableOpacity style={s.primary} onPress={() => collection()}><Text style={s.primaryText}>Khám phá bộ sưu tập      ↗</Text></TouchableOpacity><Text style={s.heroNote}>TUYỂN CHỌN KỸ LƯỠNG / TRAO GỬI CHÂN THÀNH</Text></View>
      <AnimatedFruitBanner mobile={isMobile} />
    </View>
    <View style={[s.benefits, isMobile && s.vertical]}>{[{ icon: 'sparkles-outline', title: 'Chọn vị ngon, chọn chất lượng', sub: 'Chăm chút trong từng lựa chọn' }, { icon: 'leaf-outline', title: 'Tươi lành cho mỗi ngày', sub: 'Đa dạng hương vị theo mùa' }, { icon: 'gift-outline', title: 'Quà tặng đầy tinh tế', sub: 'Gửi trao bằng cả tấm lòng' }].map(b => <View key={b.title} style={s.benefit}><Ionicons name={b.icon as any} size={27} color={GOLD}/><View><Text style={s.benefitTitle}>{b.title}</Text><Text style={s.benefitSub}>{b.sub}</Text></View></View>)}</View>
    <CampaignBanners placement="home_hero"/>
    <View style={[s.section, isMobile && s.mobilePadding]} onLayout={e => { sectionY.current = e.nativeEvent.layout.y; }}>
      <View style={[s.sectionHeading, isMobile && s.vertical]}><View><Text style={s.eyebrow}>BỘ SƯU TẬP VQ FRUIT</Text><Text style={s.heading}>Thức quả bạn yêu.</Text></View><Text style={s.descriptionSmall}>Vị ngọt thanh, hương thơm dịu.{'\n'}Chọn một chút tươi ngon cho hôm nay.</Text></View>
      <View style={s.searchRow}><View style={s.search}><Ionicons name="search-outline" size={18} color={MUTED}/><TextInput accessibilityLabel="Tìm kiếm trái cây" placeholder="Tìm trái cây, hộp quà..." value={search} onChangeText={setSearch} style={s.input} returnKeyType="search" onSubmitEditing={() => { if(search.trim()) router.push({ pathname: '/(customer)/(tabs)/categories', params: { search: search.trim() } }); }}/></View><TouchableOpacity style={s.searchButton} onPress={() => { if(search.trim()) router.push({ pathname: '/(customer)/(tabs)/categories', params: { search: search.trim() } }); else catalog(); }}><Text style={s.primaryText}>Tìm kiếm</Text></TouchableOpacity></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{FILTERS.map((f, i) => <TouchableOpacity key={f} accessibilityRole="button" accessibilityState={{ selected: filter === i }} onPress={() => setFilter(i)} style={[s.filter, filter === i && s.filterActive]}><Text style={[s.filterText, filter === i && { color: '#fff' }]}>{f}</Text></TouchableOpacity>)}</ScrollView>
      {!!message && <View style={s.message} accessibilityLiveRegion="polite"><Text style={s.descriptionSmall}>{message}</Text><TouchableOpacity onPress={() => setMessage('')} accessibilityLabel="Đóng thông báo"><Ionicons name="close" size={20} color={GREEN}/></TouchableOpacity></View>}
      {isLoading ? <ActivityIndicator color={GREEN} style={{ margin: 50 }}/> : isError ? <View style={s.empty}><Text style={s.description}>Chưa tải được sản phẩm. Hãy kiểm tra kết nối máy chủ.</Text><TouchableOpacity style={s.primary} onPress={() => refetch()}><Text style={s.primaryText}>Thử lại</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/connection-test')}><Text style={s.link}>Kiểm tra kết nối ↗</Text></TouchableOpacity></View> : visible.length === 0 ? <Text style={s.description}>Chưa có sản phẩm trong bộ sưu tập này.</Text> : <View style={s.grid}>{visible.map(p => <View key={p.id} style={[s.product, { width: isDesktop ? '23.5%' : isMobile ? '48%' : '31.5%' }]}><View style={[s.productPhoto, { height: isMobile ? 200 : 280 }]}><TouchableOpacity style={StyleSheet.absoluteFill} accessibilityLabel={`Xem ${p.name}`} onPress={() => router.push(`/(customer)/product/${p.id}`)}><FruitImage uri={resolveMediaUrl(p.thumbnail)} label={p.name} fit="contain" style={s.fill}/></TouchableOpacity><View style={s.badge}><Text style={s.badgeText}>{p.is_gift ? 'QUÀ TẶNG TINH TẾ' : 'TUYỂN CHỌN'}</Text></View><TouchableOpacity style={s.add} disabled={submitting} accessibilityLabel={`Thêm ${p.name} vào giỏ hàng`} onPress={() => add(p)}>{adding === p.id ? <ActivityIndicator color={GREEN}/> : <Ionicons name="add" size={25} color={GREEN}/>}</TouchableOpacity></View><Text style={s.origin}>{p.origin || 'BỘ SƯU TẬP QUÀ TẶNG'}</Text><TouchableOpacity onPress={() => router.push(`/(customer)/product/${p.id}`)}><Text style={s.productName} numberOfLines={2}>{p.name}</Text></TouchableOpacity><Text style={s.price}>{formatVnd(Number(p.base_price))}</Text><Text style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>{p.sale_label ? `/ ${p.sale_label}` : ""}</Text></View>)}</View>}
      <TouchableOpacity style={s.linkButton} onPress={catalog}><Text style={s.link}>Xem tất cả sản phẩm ↗</Text></TouchableOpacity>
      <TouchableOpacity style={s.store} onPress={() => router.push('/(customer)/stores')}><Ionicons name="location-outline" size={18} color={GREEN}/><Text style={s.storeText}>Mua tại: {selectedStoreName} · Đổi cửa hàng ↗</Text></TouchableOpacity>
    </View>
    <CampaignBanners placement="home_mid"/>
    <CollectionsShowcase />
    <View style={[s.gift, isMobile && s.vertical]}><FruitImage uri="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1000&q=85" label="Trái cây cho bộ quà tặng" style={[s.giftImage, isMobile && { width: '100%', height: 280 }]}/><View style={[s.giftCopy, isMobile && { width: '100%', padding: 28 }]}><Text style={s.eyebrow}>THE ART OF GIFTING</Text><Text style={s.heading}>Trao vị ngọt.{'\n'}Gửi yêu thương.</Text><Text style={s.descriptionSmall}>Một lời cảm ơn, một dịp sum vầy hay đơn giản là sự quan tâm. Để VQ FRUIT gợi ý món quà mang dấu ấn của bạn.</Text><TouchableOpacity onPress={() => collection(3)}><Text style={s.link}>Khám phá hộp quà ↗</Text></TouchableOpacity></View></View>
    {!!articles.length && <View style={[s.section, isMobile && s.mobilePadding]}><Text style={s.eyebrow}>CẢM HỨNG SỐNG LÀNH</Text><Text style={s.heading}>Chuyện của những thức quả.</Text><View style={[s.articleGrid, isMobile && s.vertical]}>{articles.slice(0,3).map(a => <TouchableOpacity key={a.id} style={[s.article, isMobile && { width: '100%' }]} onPress={() => router.push(`/(customer)/articles/${a.id}`)}><FruitImage uri={resolveMediaUrl(a.cover || a.thumbnail || a.thumbnail_url)} label={a.title} style={s.articleImage}/><Text style={s.productName}>{a.title}</Text><Text numberOfLines={2} style={s.descriptionSmall}>{a.excerpt || a.summary}</Text></TouchableOpacity>)}</View><TouchableOpacity onPress={() => router.push('/(customer)/articles')}><Text style={s.link}>Đọc tất cả cẩm nang ↗</Text></TouchableOpacity></View>}
    <View style={s.story} onLayout={e => { storyY.current = e.nativeEvent.layout.y; }}><Text style={s.eyebrow}>CÂU CHUYỆN VQ FRUIT</Text><Text style={s.storyHeading}>Điều tinh tế bắt đầu{'\n'}từ những điều giản đơn.</Text><Text style={s.storyText}>VQ FRUIT hướng đến một trải nghiệm mua trái cây nhẹ nhàng và chỉn chu. Từ bữa ăn hằng ngày đến món quà dành cho người thân, mỗi thức quả đều có thể mang theo niềm vui.</Text><Text style={s.signature}>VQ</Text></View>
    <View style={[s.footer, isMobile && s.vertical]}><View><Text style={s.logo}>VQ FRUIT</Text><Text style={s.benefitSub}>Tươi ngon mỗi ngày. Tinh tế trong từng lựa chọn.</Text></View><View style={s.footerLinks}><TouchableOpacity onPress={() => router.push('/(customer)/stores')}><Text style={s.navText}>Cửa hàng</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/(customer)/policy')}><Text style={s.navText}>Chính sách</Text></TouchableOpacity><TouchableOpacity onPress={() => router.push('/(customer)/(tabs)/account')}><Text style={s.navText}>Tài khoản</Text></TouchableOpacity></View></View><Text style={s.copyright}>© {new Date().getFullYear()} VQ FRUIT · Được chăm chút từ thiên nhiên.</Text>

  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: CREAM }, vertical: { flexDirection: 'column' }, mobilePadding: { paddingHorizontal: 20 },
  announcement: { backgroundColor: GREEN, padding: 11, alignItems: 'center' }, announcementText: { color: '#f2e9d4', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  header: { width: '100%', maxWidth: 1400, alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#dde0d5', gap: 12 },
  logo: { fontFamily: serif, fontSize: 28, letterSpacing: 3, color: GREEN }, slogan: { fontSize: 8, letterSpacing: 3, color: GREEN, textAlign: 'center', marginTop: 5 }, nav: { flexDirection: 'row', gap: 27 }, navText: { color: GREEN, fontSize: 14 }, cartButton: { padding: 13, borderWidth: 1, borderColor: '#cbd1c4', borderRadius: 30 },
  hero: { flexDirection: 'row', maxWidth: 1400, width: '100%', alignSelf: 'center', marginTop: 24, marginBottom: 28, borderRadius: 24, overflow: 'hidden', backgroundColor: '#eeeee3' }, heroCopy: { width: '50%', paddingHorizontal: 40, paddingVertical: 50, justifyContent: 'center', alignItems: 'flex-start' }, heroCopyMobile: { width: '100%', paddingHorizontal: 22, paddingVertical: 48 }, eyebrow: { fontSize: 10, letterSpacing: 2.4, color: GOLD, fontWeight: '600', lineHeight: 18 }, title: { fontFamily: serif, color: GREEN, marginVertical: 24 }, italic: { fontStyle: 'italic', color: '#7c8b58' }, description: { fontSize: 14, lineHeight: 26, color: MUTED, marginBottom: 28, maxWidth: 420 }, descriptionSmall: { fontSize: 14, lineHeight: 24, color: MUTED }, primary: { borderRadius: 10, minHeight: 50, backgroundColor: GREEN, paddingHorizontal: 25, paddingVertical: 18, alignItems: 'center' }, primaryText: { color: '#fff', fontSize: 14, fontWeight: '600' }, heroNote: { fontSize: 9, letterSpacing: 1, color: MUTED, marginTop: 34, lineHeight: 19 }, heroPhoto: { width: '50%', minHeight: 600, backgroundColor: '#d9d4bd' }, photoLabel: { position: 'absolute', bottom: 30, left: 28, right: 28, borderTopWidth: 1, borderColor: '#ffffff88', paddingTop: 17, flexDirection: 'row', justifyContent: 'space-between' }, photoText: { color: '#fff', fontSize: 10 },
  benefits: { width: '100%', maxWidth: 1400, alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#dedfd5', flexDirection: 'row', justifyContent: 'space-between', gap: 26 }, benefit: { flexDirection: 'row', gap: 15, alignItems: 'center' }, benefitTitle: { fontSize: 12, color: GREEN }, benefitSub: { fontSize: 10, lineHeight: 19, color: MUTED, marginTop: 5 },
  section: { width: '100%', maxWidth: 1400, alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 48 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }, heading: { fontFamily: serif, fontSize: 40, lineHeight: 51, marginTop: 13, marginBottom: 20, color: GREEN }, searchRow: { flexDirection: 'row', gap: 8, marginTop: 15, maxWidth: 550 }, search: { borderRadius: 10, flex: 1, borderWidth: 1, borderColor: '#d9ddd2', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 }, input: { ...Platform.select({ web: { outlineStyle: 'none' } as any }), flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 12, color: GREEN }, searchButton: { borderRadius: 10, padding: 15, backgroundColor: GREEN, justifyContent: 'center' }, filters: { gap: 10, paddingVertical: 28 }, filter: { paddingHorizontal: 21, paddingVertical: 12, borderWidth: 1, borderColor: '#d9ddd2', borderRadius: 26 }, filterActive: { backgroundColor: GREEN, borderColor: GREEN }, filterText: { color: GREEN, fontSize: 13 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 30 }, product: { marginBottom: 14 }, productPhoto: { backgroundColor: '#f0eee7', position: 'relative', borderRadius: 16, overflow: 'hidden', padding: 14 }, fill: { width: '100%', height: '100%' }, badge: { position: 'absolute', left: 12, top: 13, backgroundColor: '#fffdf6', padding: 8 }, badgeText: { color: GREEN, fontSize: 8, letterSpacing: 0.5 }, add: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#fff', borderRadius: 24, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, origin: { fontSize: 9, letterSpacing: 1.3, textTransform: 'uppercase', color: MUTED, marginTop: 19 }, productName: { color: GREEN, fontSize: 16, lineHeight: 24, marginVertical: 9 }, price: { color: GREEN, fontSize: 16, fontWeight: '600' }, link: { color: GREEN, fontSize: 12, lineHeight: 23, textDecorationLine: 'underline', marginTop: 16 }, linkButton: { alignSelf: 'center', marginVertical: 15 }, store: { marginTop: 24, flexDirection: 'row', gap: 8, alignItems: 'center' }, storeText: { color: GREEN, fontSize: 11, flex: 1, lineHeight: 20 }, message: { padding: 15, backgroundColor: '#e9ecdf', marginBottom: 22, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, empty: { paddingVertical: 35, alignItems: 'flex-start' },
  gift: { marginHorizontal: '6%', marginBottom: 70, backgroundColor: '#e9ecdf', flexDirection: 'row' }, giftImage: { width: '50%', minHeight: 400 }, giftCopy: { width: '50%', padding: 48, justifyContent: 'center' }, story: { paddingVertical: 65, paddingHorizontal: '8%', backgroundColor: GREEN, alignItems: 'center' }, storyHeading: { fontFamily: serif, color: CREAM, fontSize: 36, lineHeight: 48, textAlign: 'center', marginVertical: 22 }, storyText: { color: '#bec9bd', fontSize: 12, lineHeight: 25, textAlign: 'center', maxWidth: 650 }, signature: { fontFamily: serif, fontSize: 28, color: '#c4a467', marginTop: 25 }, footer: { paddingHorizontal: '6%', paddingVertical: 45, flexDirection: 'row', justifyContent: 'space-between', gap: 25 }, footerLinks: { flexDirection: 'row', gap: 25, alignItems: 'center' }, copyright: { marginHorizontal: '6%', borderTopWidth: 1, borderColor: '#dce0d4', paddingVertical: 20, fontSize: 10, color: MUTED }, articleGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 }, article: { width: '31.5%' }, articleImage: { height: 200, width: '100%' },
});
