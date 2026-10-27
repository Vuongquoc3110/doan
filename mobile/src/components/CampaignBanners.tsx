import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Platform, Linking, useWindowDimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { resolveMediaUrl, PLACEHOLDER_PRODUCT_IMAGE } from '../utils/media';

export function CampaignBanners({ placement }: { placement: 'home_hero' | 'home_mid' | 'category_top' }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const mobile = width < 768;
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const platform = Platform.OS === 'web' ? 'web' : 'mobile';
  const { data: banners = [] } = useQuery<any[]>({ queryKey: ['campaign-banners', placement, platform], queryFn: async () => (await apiClient.get('/v1/banners', { params: { placement, platform } })).data.data, refetchInterval: 60000 });
  const banner = banners[index % Math.max(1, banners.length)];
  const normalized = String(banner?.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const search = normalized.includes('cherry') ? 'cherry' : normalized.includes('nho') ? 'nho' : normalized.includes('tao') ? 'táo' : normalized.includes('qua') ? 'hộp quà' : '';
  const artwork = banner && (mobile ? banner.image_mobile || banner.image_url : banner.image_web || banner.image_url);
  const sample = /\/banners\/banner_\d+_(?:web|mobile)\.svg(?:\?|$)/i.test(artwork || '');
  const { data: photos = [] } = useQuery<any[]>({ queryKey: ['campaign-photos', search], enabled: !!banner && sample && !!search, queryFn: async () => (await apiClient.get('/v1/products', { params: { search, limit: 1 } })).data.data });
  useEffect(() => { setFailed(false); setError(''); }, [banner?.id]);
  useEffect(() => {
    if (!banner?.countdown_at) return;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [banner?.countdown_at]);
  if (!banner) return null;
  const photo = failed ? PLACEHOLDER_PRODUCT_IMAGE : sample ? resolveMediaUrl(photos[0]?.thumbnail) : resolveMediaUrl(artwork);
  async function open() {
    setError('');
    try {
      const value = String(banner.link_value || '');
      if (banner.link_type === 'collection') router.push({ pathname: '/(customer)/(tabs)/categories', params: { collection_slug: value } });
      else if (banner.link_type === 'product') router.push(`/(customer)/product/${encodeURIComponent(value)}`);
      else if (banner.link_type === 'article') router.push(`/(customer)/articles/${encodeURIComponent(value)}`);
      else if (/^https:\/\//.test(banner.link_url)) await Linking.openURL(banner.link_url);
      else if (String(banner.link_url).startsWith('/(customer)/')) router.push(banner.link_url as any);
      else if (String(banner.link_url).startsWith('/collections/')) router.push({ pathname: '/(customer)/(tabs)/categories', params: { collection_slug: banner.link_url.split('/').pop() } });
      else router.push('/(customer)/(tabs)/categories');
    } catch { setError('Chưa mở được nội dung. Vui lòng thử lại.'); }
  }
  return <View style={[s.section, mobile && s.sectionMobile]}>
    <View style={[s.banner, mobile && s.bannerMobile]}>
      <View style={[s.copy, mobile && s.copyMobile]}>
        <Text style={s.eyebrow}>VQ FRUIT / TUYỂN CHỌN THEO MÙA</Text>
        <Text style={[s.title, mobile && s.titleMobile]}>{banner.title}</Text>
        {!!banner.subtitle && <Text style={s.subtitle}>{banner.subtitle}</Text>}
        {Date.parse(banner.countdown_at) > now && <Text style={s.subtitle}>Ưu đãi còn {Math.floor((Date.parse(banner.countdown_at) - now) / 3600000)} giờ {Math.floor((Date.parse(banner.countdown_at) - now) / 60000) % 60} phút</Text>}
        <TouchableOpacity accessibilityRole="button" onPress={open} style={s.cta}><Text style={s.ctaText}>{banner.cta_label || 'Khám phá bộ sưu tập'}</Text><Ionicons name="arrow-forward" size={19} color="#183e32" /></TouchableOpacity>
        {banners.length > 1 && <View style={s.controls}>
          <TouchableOpacity accessibilityLabel="Banner trước" style={s.arrow} onPress={() => setIndex((index + banners.length - 1) % banners.length)}><Ionicons name="chevron-back" size={20} color="#edf2df" /></TouchableOpacity>
          <Text style={s.counter}>{String(index % banners.length + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}</Text>
          <TouchableOpacity accessibilityLabel="Banner tiếp theo" style={s.arrow} onPress={() => setIndex((index + 1) % banners.length)}><Ionicons name="chevron-forward" size={20} color="#edf2df" /></TouchableOpacity>
        </View>}
      </View>
      <View style={[s.visual, mobile && s.visualMobile]}><Image accessibilityLabel={banner.title} source={{ uri: photo }} onError={() => setFailed(true)} style={s.image} resizeMode="cover" /><View style={s.photoLabel}><Ionicons name="leaf-outline" size={16} color="#183e32" /><Text style={s.photoLabelText}>Tươi ngon, được chọn bằng sự quan tâm.</Text></View></View>
    </View>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View>;
}
const s = StyleSheet.create({
  section: { paddingHorizontal: 32, paddingVertical: 18, maxWidth: 1400, width: '100%', alignSelf: 'center' }, sectionMobile: { paddingHorizontal: 16, paddingVertical: 18 },
  banner: { flexDirection: 'row', overflow: 'hidden', borderRadius: 22, backgroundColor: '#183e32', minHeight: 330 }, bannerMobile: { flexDirection: 'column' },
  copy: { width: '50%', padding: 32, justifyContent: 'center', alignItems: 'flex-start' }, copyMobile: { width: '100%', padding: 26 },
  eyebrow: { color: '#c3d3ad', fontSize: 10, letterSpacing: 1.8, marginBottom: 22 }, title: { color: '#fffdf2', fontSize: 30, lineHeight: 40, fontWeight: '600', letterSpacing: -0.6 }, titleMobile: { fontSize: 27, lineHeight: 36 },
  subtitle: { color: '#c8d5c6', fontSize: 14, lineHeight: 24, marginTop: 16, maxWidth: 440 }, cta: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#e9efd9', borderRadius: 9, minHeight: 50, paddingHorizontal: 20, paddingVertical: 12, marginTop: 26 }, ctaText: { color: '#183e32', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 26 }, arrow: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#ffffff40', alignItems: 'center', justifyContent: 'center' }, counter: { fontSize: 11, letterSpacing: 2, color: '#d1dfc2' },
  visual: { width: '50%', backgroundColor: '#edf0e3', minHeight: 390 }, visualMobile: { width: '100%', minHeight: 240, height: 260 }, image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' }, photoLabel: { position: 'absolute', bottom: 18, left: 18, right: 18, backgroundColor: '#fffef5ed', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, photoLabelText: { flex: 1, fontSize: 11, color: '#183e32', lineHeight: 18 }, error: { color: '#a63f32', marginTop: 12 },
});
