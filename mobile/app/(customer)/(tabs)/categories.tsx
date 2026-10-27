import {CampaignBanners} from '../../../src/components/CampaignBanners';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  ActivityIndicator,
  Modal, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../../src/api/client';
import { useCartStore } from '../../../src/store/useCartStore';
import { formatVnd } from '../../../src/utils/format';
import COLORS from '../../../src/theme/colors';
import { resolveMediaUrl } from '../../../src/utils/media';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { useBreakpoint } from '../../../src/hooks/useBreakpoint';
import ShopNavigation from '../../../src/components/ShopNavigation';

const ORIGINS = [
  { label: 'Tất cả xuất xứ', value: '' },
  { label: 'Việt Nam', value: 'Việt Nam' },
  { label: 'Pháp', value: 'Pháp' },
  { label: 'Canada', value: 'Canada' },
  { label: 'Nam Phi', value: 'Nam Phi' },
  { label: 'Chile', value: 'Chile' },
  { label: 'Úc 🇦🇺', value: 'Úc' },
  { label: 'Nhật Bản 🇯🇵', value: 'Nhật Bản' },
  { label: 'Mỹ 🇺🇸', value: 'Mỹ' },
  { label: 'Hàn Quốc 🇰🇷', value: 'Hàn Quốc' },
  { label: 'New Zealand 🇳🇿', value: 'New Zealand' },
];

const PRICE_RANGES = [
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: '< 500.000₫', min: 0, max: 500000 },
  { label: '500k - 1.000.000₫', min: 500000, max: 1000000 },
  { label: '1.000.000₫ - 2.500.000₫', min: 1000000, max: 2500000 },
  { label: '2.500.000 – 5.000.000₫', min: 2500000, max: 5000000 },
  { label: '> 5.000.000₫', min: 5000000, max: undefined },
];

const SORT_OPTIONS = [
  { label: 'Nổi bật', sort: 'popular' },
  { label: 'Giá thấp → cao', sort: 'price_asc' },
  { label: 'Giá cao → thấp', sort: 'price_desc' },
  { label: 'Tên A–Z', sort: 'name_asc' },
  { label: 'Tên Z–A', sort: 'name_desc' },
  { label: 'Mới nhất', sort: 'newest' },
  { label: 'Cũ nhất', sort: 'oldest' },
  { label: 'Giảm giá nhiều', sort: 'discount' },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category_id?: string; search?: string; collection_slug?: string; gift?: string }>();
  const addItem = useCartStore((state) => state.addItem);
  const authenticated = useAuthStore(s => s.isAuthenticated);
  const { isDesktop, isMobile, width } = useBreakpoint();
  const columns = width >= 1440 ? 4 : isDesktop ? 3 : 2;
  const [collection, setCollection] = useState(params.collection_slug || '');
  const [gift, setGift] = useState(params.gift === '1');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(params.search || '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [search, setSearch] = useState(params.search || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    params.category_id ? Number(params.category_id) : undefined
  );
  const [selectedOrigin, setSelectedOrigin] = useState<string>('');
  const [selectedPriceRangeIndex, setSelectedPriceRangeIndex] = useState<number>(0);
  const [selectedSortIndex, setSelectedSortIndex] = useState<number>(0);

  useEffect(() => {
    setSelectedCategoryId(params.category_id ? Number(params.category_id) : undefined);
    setSearch(params.search || '');
    setCollection(params.collection_slug || '');
    setGift(params.gift === '1');
    setPage(1);
  }, [params.category_id, params.search, params.collection_slug, params.gift]);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { setPage(1); }, [selectedCategoryId, selectedOrigin, selectedPriceRangeIndex, selectedSortIndex, debouncedSearch, collection, gift]);
  const { data: collections = [] } = useQuery<any[]>({ queryKey: ['collections'], queryFn: async () => (await apiClient.get('/v1/collections')).data.data });
  const { data: suggestions = [] } = useQuery<any[]>({ queryKey: ['suggestions', debouncedSearch], enabled: showSuggestions && debouncedSearch.length >= 2, queryFn: async () => (await apiClient.get('/v1/products/search-suggestions', { params: { q: debouncedSearch } })).data.data });

  // Fetch Categories List
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-catalog'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/categories');
      return res.data?.data || [];
    },
  });

  // Fetch Products based on current filters
  const sortFilter = SORT_OPTIONS[selectedSortIndex];

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'catalog-products',
      selectedCategoryId,
      selectedOrigin,
      selectedPriceRangeIndex,
      selectedSortIndex,
      debouncedSearch, collection, gift, page,
    ],
    queryFn: async () => {
      const p: any = { limit: 24, page };
      if (collection) p.collection_slug = collection;
      if (gift) p.is_gift = 1;
      if (selectedCategoryId) p.category_id = selectedCategoryId;
      if (selectedOrigin) p.origin = selectedOrigin;
      if (selectedPriceRangeIndex) p.price_range = ['', 'under_500k', '500k_1m', '1m_2.5m', '2.5m_5m', 'above_5m'][selectedPriceRangeIndex];
      if (debouncedSearch) p.search = debouncedSearch;
      p.sort = sortFilter.sort;
      const res = await apiClient.get('/v1/products', { params: p });
      return res.data;
    },
  });
  const products: any[] = result?.data || [];
  const pagination = result?.pagination;

  const handleAddToCart = async (product: any) => {
    if (adding !== null) return;
    if (!authenticated) { router.push('/(auth)/login'); return; }
    setAdding(product.id); setMessage('');
    try {
      const detail = (await apiClient.get(`/v1/products/${product.id}`)).data.data;
      if (detail.variants?.length !== 1) { router.push(`/(customer)/product/${product.id}`); return; }
      await addItem(detail.variants[0].id, 1);
      setMessage(`Đã thêm ${product.name} vào giỏ hàng.`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Không thể thêm sản phẩm');
    } finally { setAdding(null); }
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ category: true, collection: false, origin: true, price: true });
  const activeCount = Number(!!selectedCategoryId) + Number(!!collection) + Number(gift) + Number(!!selectedOrigin) + Number(selectedPriceRangeIndex > 0);
  const reset = () => {
    setSearch(''); setDebouncedSearch(''); setSelectedCategoryId(undefined); setSelectedOrigin('');
    setSelectedPriceRangeIndex(0); setCollection(''); setGift(false); setSelectedSortIndex(0); setPage(1); setShowSuggestions(false);
    router.setParams({ category_id: '', search: '', collection_slug: '', gift: '' });
  };
  const filterRow = (label: string, selected: boolean, action: () => void, count?: number) => (
    <TouchableOpacity key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={action} style={[s.filterRow, selected && s.filterRowActive]}>
      <View style={[s.radio, selected && s.radioSelected]}>{selected && <View style={s.radioDot}/>}</View>
      <Text style={[s.filterLabel, selected && s.filterLabelActive]}>{label.replace(/\s[\u{1F1E6}-\u{1F1FF}]+/gu, '')}</Text>
      {count !== undefined && <Text style={s.filterCount}>{count}</Text>}
    </TouchableOpacity>
  );
  const group = (key: string, title: string, children: React.ReactNode) => <View style={s.filterGroup}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: !!expanded[key] }} style={s.groupHeader} onPress={() => setExpanded(previous => ({ ...previous, [key]: !previous[key] }))}><Text style={s.groupTitle}>{title}</Text><Ionicons name={expanded[key] ? 'remove' : 'add'} size={18} color={COLORS.primary}/></TouchableOpacity>
    {expanded[key] && children}
  </View>;
  const filterContent = <>
    <View style={s.filterHeading}><View style={s.inline}><Ionicons name="options-outline" size={18} color={COLORS.primary}/><Text style={s.groupTitle}>Bộ lọc</Text>{activeCount > 0 && <Text style={s.countBadge}>{activeCount}</Text>}</View><TouchableOpacity accessibilityRole="button" onPress={reset}><Text style={s.reset}>Đặt lại</Text></TouchableOpacity></View>
    {group('category', 'Danh mục sản phẩm', <>{filterRow('Tất cả sản phẩm', !selectedCategoryId, () => setSelectedCategoryId(undefined))}{categories.map((c: any) => filterRow(c.name, selectedCategoryId === c.id, () => setSelectedCategoryId(c.id), Number(c.product_count)))}</>)}
    {group('collection', 'Bộ sưu tập & quà tặng', <>{filterRow('Tất cả bộ sưu tập', !collection, () => setCollection(''))}{collections.map(c => filterRow(c.name, collection === c.slug, () => setCollection(c.slug)))}<TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: gift }} onPress={() => setGift(!gift)} style={s.filterRow}><Ionicons name={gift ? 'checkbox' : 'square-outline'} size={19} color={COLORS.primary}/><Text style={s.filterLabel}>Chỉ sản phẩm quà tặng</Text></TouchableOpacity></>)}
    {group('origin', 'Xuất xứ', <View style={s.originWrap}>{ORIGINS.map(o => <TouchableOpacity key={o.value} accessibilityRole="button" accessibilityState={{ selected: selectedOrigin === o.value }} style={[s.originChip, selectedOrigin === o.value && s.originChipActive]} onPress={() => setSelectedOrigin(o.value)}><Text style={[s.originText, selectedOrigin === o.value && s.originTextActive]}>{o.value || 'Tất cả'}</Text></TouchableOpacity>)}</View>)}
    {group('price', 'Khoảng giá', PRICE_RANGES.map((price, index) => filterRow(price.label, selectedPriceRangeIndex === index, () => setSelectedPriceRangeIndex(index))))}
    <View style={s.sideNote}><Ionicons name="leaf-outline" size={23} color={COLORS.primary}/><Text style={s.sideNoteTitle}>Một chút tươi lành.</Text><Text style={s.sideNoteText}>Chọn thức quả yêu thích cho bữa ăn mỗi ngày, hay một món quà gửi trao.</Text></View>
  </>;
  const selectedChips: { label: string; remove: () => void }[] = [];
  if (selectedCategoryId) selectedChips.push({ label: categories.find((c: any) => c.id === selectedCategoryId)?.name || 'Danh mục', remove: () => setSelectedCategoryId(undefined) });
  if (collection) selectedChips.push({ label: collections.find(c => c.slug === collection)?.name || 'Bộ sưu tập', remove: () => setCollection('') });
  if (selectedOrigin) selectedChips.push({ label: selectedOrigin, remove: () => setSelectedOrigin('') });
  if (selectedPriceRangeIndex) selectedChips.push({ label: PRICE_RANGES[selectedPriceRangeIndex].label, remove: () => setSelectedPriceRangeIndex(0) });
  if (gift) selectedChips.push({ label: 'Quà tặng', remove: () => setGift(false) });
  return <View style={s.page}>
    <ScrollView style={s.pageScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scrollContent}>
      <ShopNavigation branded />
      <CampaignBanners placement="category_top"/>
      <View style={[s.contentWidth, s.pageContent, !isDesktop && s.pageContentSmall]}>
        <View style={s.breadcrumb}><TouchableOpacity onPress={() => router.push('/(customer)/(tabs)')}><Text style={s.muted}>Trang chủ</Text></TouchableOpacity><Text style={s.muted}>/</Text><Text style={s.breadcrumbCurrent}>Bộ sưu tập trái cây</Text></View>
        <View style={[s.intro, !isDesktop && s.introSmall]}>
          <View style={s.introCopy}><Text style={s.eyebrow}>THE FRESH COLLECTION</Text><Text style={[s.title, isMobile && s.titleSmall]}>Vị ngon, đúng gu bạn.</Text><Text style={s.subtitle}>Từ thức quả mỗi ngày đến những món quà đầy tinh tế.</Text></View>
          <View style={[s.searchArea, !isDesktop && { width: '100%' }]}>
            <View style={s.searchBox}><Ionicons name="search-outline" size={21} color={COLORS.primary}/><TextInput accessibilityLabel="Tìm kiếm sản phẩm" style={s.searchInput} placeholder="Bạn đang tìm thức quả nào?" placeholderTextColor="#8a9185" value={search} onChangeText={text => { setSearch(text); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onSubmitEditing={() => { setShowSuggestions(false); setDebouncedSearch(search.trim()); setPage(1); }} returnKeyType="search"/>{!!search && <TouchableOpacity accessibilityLabel="Xóa tìm kiếm" style={s.clearSearch} onPress={() => { setSearch(''); setShowSuggestions(false); }}><Ionicons name="close" size={18} color={COLORS.muted}/></TouchableOpacity>}</View>
            {showSuggestions && debouncedSearch.length >= 2 && suggestions.length > 0 && <View style={s.suggestions}>{suggestions.map(p => <TouchableOpacity key={p.id} style={s.suggestionRow} onPress={() => { setShowSuggestions(false); router.push(`/(customer)/product/${p.id}`); }}><Image source={{ uri: resolveMediaUrl(p.thumbnail) }} style={s.suggestionImage}/><View style={{ flex: 1 }}><Text style={s.suggestionName}>{p.name}</Text><Text style={s.muted}>{formatVnd(p.base_price)}</Text></View><Ionicons name="arrow-forward" size={16} color={COLORS.primary}/></TouchableOpacity>)}<TouchableOpacity onPress={() => setShowSuggestions(false)} style={s.clearSearch}><Text style={s.reset}>Đóng gợi ý</Text></TouchableOpacity></View>}
          </View>
        </View>
        <View style={s.main}>
          {isDesktop && <View style={s.sidebar}>{filterContent}</View>}
          <View style={s.results}>
            <View style={[s.toolbar, isMobile && s.toolbarSmall]}>
              <Text style={s.resultCount}><Text style={s.total}>{pagination?.total ?? products.length}</Text> sản phẩm được tuyển chọn</Text>
              <View style={s.toolbarActions}>{!isDesktop && <TouchableOpacity style={s.outlineButton} onPress={() => setFiltersOpen(true)}><Ionicons name="options-outline" size={17} color={COLORS.primary}/><Text style={s.buttonLabel}>Bộ lọc{activeCount ? ` (${activeCount})` : ''}</Text></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" accessibilityLabel="Chọn cách sắp xếp" style={s.outlineButton} onPress={() => setSortOpen(true)}><Text style={s.buttonLabel}>{sortFilter.label}</Text><Ionicons name="chevron-down" size={15} color={COLORS.primary}/></TouchableOpacity></View>
            </View>
            {selectedChips.length > 0 && <View style={s.selectedChips}>{selectedChips.map(chip => <TouchableOpacity key={chip.label} style={s.selectedChip} accessibilityLabel={`Bỏ lọc ${chip.label}`} onPress={chip.remove}><Text style={s.selectedChipText}>{chip.label}</Text><Ionicons name="close" size={14} color={COLORS.primary}/></TouchableOpacity>)}</View>}
            {!!message && <View style={s.notice}><Ionicons name="information-circle-outline" size={19} color={COLORS.primary}/><Text accessibilityLiveRegion="polite" style={s.noticeText}>{message}</Text><TouchableOpacity accessibilityLabel="Đóng thông báo" onPress={() => setMessage('')}><Ionicons name="close" size={18} color={COLORS.primary}/></TouchableOpacity></View>}
            {isLoading ? <View style={s.empty}><ActivityIndicator color={COLORS.primary}/><Text style={s.subtitle}>Đang chọn những thức quả ngon…</Text></View> : isError ? <View style={s.empty}><Ionicons name="cloud-offline-outline" size={36} color={COLORS.muted}/><Text style={s.emptyTitle}>Chưa tải được bộ sưu tập</Text><TouchableOpacity style={s.primaryButton} onPress={() => refetch()}><Text style={s.primaryText}>Thử lại</Text></TouchableOpacity></View> : products.length === 0 ? <View style={s.empty}><Ionicons name="search-outline" size={36} color={COLORS.muted}/><Text style={s.emptyTitle}>Chưa tìm thấy thức quả bạn chọn</Text><Text style={s.subtitle}>Thử một từ khóa khác hoặc nới rộng bộ lọc nhé.</Text><TouchableOpacity style={s.primaryButton} onPress={reset}><Text style={s.primaryText}>Xem tất cả sản phẩm</Text></TouchableOpacity></View> : <>
              <View style={s.grid}>{products.map(item => <View key={item.id} style={[s.productCard, { width: `${(100 - (columns - 1) * 2) / columns}%` }]}>
                <TouchableOpacity accessibilityLabel={`Xem ${item.name}`} style={s.imageBox} activeOpacity={0.9} onPress={() => router.push(`/(customer)/product/${item.id}`)}><Image source={{ uri: resolveMediaUrl(item.thumbnail) }} style={s.productImage} resizeMode="cover"/>{Number(item.compare_price) > Number(item.base_price) && <View style={s.saleBadge}><Text style={s.saleText}>−{Math.round((1 - Number(item.base_price) / Number(item.compare_price)) * 100)}%</Text></View>}<View style={s.imageArrow}><Ionicons name="arrow-up-right-box-outline" size={17} color={COLORS.primary}/></View></TouchableOpacity>
                <View style={[s.cardBody, isMobile && s.cardBodySmall]}><Text style={s.productOrigin} numberOfLines={1}>{item.origin || item.category_name || 'VQ FRUIT'}</Text><TouchableOpacity onPress={() => router.push(`/(customer)/product/${item.id}`)}><Text style={[s.productName, isMobile && s.productNameSmall]} numberOfLines={2}>{item.name}</Text></TouchableOpacity><View style={s.priceRow}><Text style={[s.price, isMobile && s.priceSmall]}>{formatVnd(item.base_price)}</Text><Text style={{ fontSize: 10, color: COLORS.muted }}>{item.sale_label ? `/ ${item.sale_label}` : ""}</Text>{Number(item.compare_price) > Number(item.base_price) && <Text style={s.oldPrice}>{formatVnd(item.compare_price)}</Text>}</View><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Chọn mua ${item.name}`} style={[s.buyButton, adding !== null && { opacity: 0.55 }]} disabled={adding !== null} onPress={() => handleAddToCart(item)}><Text style={s.buyText}>{adding === item.id ? 'Đang thêm…' : 'Chọn mua'}</Text><Ionicons name="add" size={18} color={COLORS.primary}/></TouchableOpacity></View>
              </View>)}</View>
              {pagination?.totalPages > 1 && <View style={s.pagination}><TouchableOpacity accessibilityLabel="Trang trước" disabled={page <= 1} style={[s.pageButton, page <= 1 && { opacity: 0.3 }]} onPress={() => setPage(page - 1)}><Ionicons name="chevron-back" size={18} color={COLORS.primary}/></TouchableOpacity><Text style={s.pageText}>Trang <Text style={s.total}>{page}</Text> / {pagination.totalPages}</Text><TouchableOpacity accessibilityLabel="Trang tiếp theo" disabled={page >= pagination.totalPages} style={[s.pageButton, page >= pagination.totalPages && { opacity: 0.3 }]} onPress={() => setPage(page + 1)}><Ionicons name="chevron-forward" size={18} color={COLORS.primary}/></TouchableOpacity></View>}
            </>}
            <View style={s.bottomNote}><Ionicons name="leaf-outline" size={16} color={COLORS.muted}/><Text style={s.bottomNoteText}>VQ FRUIT · Tươi ngon mỗi ngày, tinh tế trong từng lựa chọn.</Text></View>
          </View>
        </View>
      </View>
    </ScrollView>
    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}><View style={s.modalOverlay}><View style={s.filterModal}><View style={s.modalHeader}><Text style={s.emptyTitle}>Tìm vị ngon của bạn</Text><TouchableOpacity accessibilityLabel="Đóng bộ lọc" style={s.clearSearch} onPress={() => setFiltersOpen(false)}><Ionicons name="close" size={22} color={COLORS.primary}/></TouchableOpacity></View><ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>{filterContent}</ScrollView><TouchableOpacity style={s.applyButton} onPress={() => setFiltersOpen(false)}><Text style={s.primaryText}>Xem {pagination?.total ?? products.length} sản phẩm</Text><Ionicons name="arrow-forward" size={18} color="#fff"/></TouchableOpacity></View></View></Modal>
    <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}><View style={s.sortOverlay}><View style={s.sortModal}><View style={s.modalHeader}><Text style={s.emptyTitle}>Sắp xếp sản phẩm</Text><TouchableOpacity accessibilityLabel="Đóng sắp xếp" style={s.clearSearch} onPress={() => setSortOpen(false)}><Ionicons name="close" size={21} color={COLORS.primary}/></TouchableOpacity></View><ScrollView>{SORT_OPTIONS.map((option, index) => filterRow(option.label, selectedSortIndex === index, () => { setSelectedSortIndex(index); setSortOpen(false); }))}</ScrollView></View></View></Modal>
  </View>;
}
const serif = Platform.select({ web: '"Times New Roman", serif', ios: 'Times New Roman', default: 'serif' });
const s = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: '#f8f7f2' }, pageScroll: { flex: 1, minHeight: 0 }, scrollContent: { flexGrow: 1 }, pageContent: { paddingHorizontal: 52, paddingBottom: 32 }, pageContentSmall: { paddingHorizontal: 20 }, contentWidth: { width: '100%', maxWidth: 1480, alignSelf: 'center' },
  breadcrumb: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 26 }, muted: { color: '#7c8277', fontSize: 12 }, breadcrumbCurrent: { color: COLORS.primary, fontSize: 12 },
  intro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 32, paddingTop: 32, paddingBottom: 38, borderBottomWidth: 1, borderColor: '#e1e4d8', zIndex: 5 }, introSmall: { flexDirection: 'column', alignItems: 'stretch', gap: 24, paddingTop: 26, paddingBottom: 26 }, introCopy: { flex: 1 }, eyebrow: { fontSize: 10, letterSpacing: 2.4, color: '#8a794b', fontWeight: '600', marginBottom: 12 }, title: { fontFamily: serif, fontSize: 48, lineHeight: 58, color: COLORS.primary }, titleSmall: { fontSize: 36, lineHeight: 44 }, subtitle: { color: '#7b8276', fontSize: 13, lineHeight: 23, marginTop: 10 },
  searchArea: { width: 350, zIndex: 10 }, searchBox: { borderWidth: 1, borderColor: '#d8dece', backgroundColor: '#fffefa', borderRadius: 6, paddingLeft: 17, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 }, searchInput: { flex: 1, minWidth: 0, color: COLORS.primary, fontSize: 13, paddingVertical: 16 }, clearSearch: { padding: 12 }, suggestions: { position: 'absolute', top: 58, left: 0, right: 0, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#d8dece', borderRadius: 8, padding: 10, zIndex: 30, elevation: 8 }, suggestionRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 }, suggestionImage: { width: 42, height: 42, borderRadius: 4 }, suggestionName: { fontSize: 12, color: COLORS.primary, lineHeight: 18, marginBottom: 4 },
  main: { flexDirection: 'row', gap: 40, alignItems: 'flex-start', paddingTop: 28 }, sidebar: { width: 226, flexShrink: 0 }, results: { flex: 1, minWidth: 0 }, filterHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 42, marginBottom: 12 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 9 }, groupTitle: { fontSize: 13, fontWeight: '600', color: COLORS.primary }, countBadge: { backgroundColor: '#e7ecdf', borderRadius: 10, paddingHorizontal: 6, fontSize: 11, color: COLORS.primary }, reset: { color: '#7b8276', fontSize: 11, textDecorationLine: 'underline' }, filterGroup: { borderBottomWidth: 1, borderColor: '#e1e4d8', paddingBottom: 18, marginBottom: 16 }, groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginBottom: 4 }, filterRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 10, paddingHorizontal: 8, borderRadius: 5 }, filterRowActive: { backgroundColor: '#e9ede2' }, radio: { width: 14, height: 14, borderWidth: 1, borderColor: '#c0c8b6', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: COLORS.primary }, radioDot: { width: 6, height: 6, backgroundColor: COLORS.primary, borderRadius: 4 }, filterLabel: { flex: 1, fontSize: 12, color: '#70796b', lineHeight: 19 }, filterLabelActive: { color: COLORS.primary, fontWeight: '600' }, filterCount: { fontSize: 10, color: '#98a08f' }, originWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingTop: 6 }, originChip: { paddingHorizontal: 11, paddingVertical: 11, borderWidth: 1, borderColor: '#e0e4d7', borderRadius: 4 }, originChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, originText: { fontSize: 11, color: '#70796b' }, originTextActive: { color: '#fff' }, sideNote: { padding: 20, backgroundColor: '#eef0e5', borderRadius: 6, marginTop: 10 }, sideNoteTitle: { fontFamily: serif, fontSize: 23, color: COLORS.primary, marginTop: 12 }, sideNoteText: { fontSize: 11, lineHeight: 21, color: '#7b8276', marginTop: 8 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, minHeight: 42 }, toolbarSmall: { flexDirection: 'column', alignItems: 'stretch' }, resultCount: { color: '#7b8276', fontSize: 12 }, total: { color: COLORS.primary, fontWeight: '600' }, toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 }, outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderWidth: 1, borderColor: '#d8dece', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 5, backgroundColor: '#fffefa' }, buttonLabel: { color: COLORS.primary, fontSize: 12 }, selectedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }, selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#e9ede2', borderRadius: 4 }, selectedChipText: { color: COLORS.primary, fontSize: 11 }, notice: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#e9ede2', borderRadius: 6, marginBottom: 20, alignItems: 'center' }, noticeText: { color: COLORS.primary, fontSize: 12, flex: 1, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: '2%', rowGap: 26 }, productCard: { backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e8e8de', borderRadius: 8, overflow: 'hidden' }, imageBox: { width: '100%', aspectRatio: 1.05, backgroundColor: '#eeeee5', position: 'relative', overflow: 'hidden' }, productImage: { width: '100%', height: '100%' }, saleBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#fffef7', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 3 }, saleText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' }, imageArrow: { position: 'absolute', bottom: 12, right: 12, width: 30, height: 30, backgroundColor: '#fffef2ed', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }, cardBody: { padding: 18 }, cardBodySmall: { padding: 12 }, productOrigin: { color: '#859077', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 9 }, productName: { color: COLORS.primary, fontSize: 15, lineHeight: 23, minHeight: 46, fontWeight: '500' }, productNameSmall: { fontSize: 13, lineHeight: 20, minHeight: 40 }, priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, minHeight: 42, marginTop: 13 }, price: { fontSize: 17, color: COLORS.primary, fontWeight: '600' }, priceSmall: { fontSize: 15 }, oldPrice: { fontSize: 11, color: '#9a9e92', textDecorationLine: 'line-through' }, buyButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#e8e8de', paddingTop: 14, minHeight: 44 }, buyText: { fontSize: 12, fontWeight: '500', color: COLORS.primary },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, paddingVertical: 40 }, pageButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#d8dece', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, pageText: { fontSize: 12, color: '#7b8276' }, bottomNote: { borderTopWidth: 1, borderColor: '#e1e4d8', paddingTop: 22, marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, bottomNoteText: { flexShrink: 1, color: '#929889', fontSize: 11, lineHeight: 19 }, empty: { paddingVertical: 70, paddingHorizontal: 20, alignItems: 'center', gap: 16 }, emptyTitle: { fontSize: 18, color: COLORS.primary, fontWeight: '500' }, primaryButton: { padding: 16, borderRadius: 5, backgroundColor: COLORS.primary }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: '#14291f77', justifyContent: 'flex-end' }, filterModal: { width: '100%', maxHeight: '92%', backgroundColor: '#f8f7f2', borderTopLeftRadius: 18, borderTopRightRadius: 18 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15, padding: 20 }, applyButton: { margin: 20, backgroundColor: COLORS.primary, padding: 17, borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sortOverlay: { flex: 1, backgroundColor: '#14291f77', padding: 24, justifyContent: 'center', alignItems: 'center' }, sortModal: { width: '100%', maxWidth: 380, maxHeight: '85%', backgroundColor: '#fffefa', borderRadius: 12, padding: 16 },
});