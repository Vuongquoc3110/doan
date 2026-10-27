import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import apiClient from '../api/client';
import { resolveMediaUrl } from '../utils/media';
import COLORS from '../theme/colors';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function CollectionsShowcase() {
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const { data: collections = [] } = useQuery<any[]>({ queryKey: ['collections'], queryFn: async () => (await apiClient.get('/v1/collections')).data.data });
  if (!collections.length) return null;
  return <View style={s.section}><Text style={s.eyebrow}>CHỌN THEO DỊP · CHỌN THEO SỞ THÍCH</Text><Text style={s.title}>Một món quà, nhiều lời thương.</Text><View style={s.grid}>{collections.filter(c => Number(c.product_count) > 0).map(c => <TouchableOpacity key={c.id} style={[s.card, { width: isMobile ? '100%' : '31%' }]} onPress={() => router.push({ pathname: '/(customer)/(tabs)/categories', params: { collection_slug: c.slug, category_id: '', search: '', gift: '' } })}><Image source={{ uri: resolveMediaUrl(c.banner) }} style={s.image}/><Text style={s.name}>{c.name}</Text><Text style={s.meta}>{c.product_count} sản phẩm · Khám phá →</Text></TouchableOpacity>)}</View></View>;
}
const s = StyleSheet.create({ section: { paddingHorizontal: '6%', paddingVertical: 40 }, eyebrow: { color: COLORS.gold, fontSize: 11, letterSpacing: 1.5, marginBottom: 15 }, title: { color: COLORS.text, fontSize: 28, marginBottom: 24 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 }, card: { paddingBottom: 18, borderBottomWidth: 1, borderColor: COLORS.borderStrong }, image: { width: '100%', height: 170, backgroundColor: COLORS.surfaceMuted }, name: { color: COLORS.text, fontSize: 16, lineHeight: 24, marginTop: 15 }, meta: { color: COLORS.muted, fontSize: 12, marginTop: 8 } });
