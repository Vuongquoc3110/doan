import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import COLORS from '../theme/admin';

// Use native layout primitives so the same chart renders on web without SVG attributes.
export default function RevenueBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const numbers = labels.map((_, index) => {
    const value = Number(values[index]);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  });
  const maximum = Math.max(1, ...numbers);
  if (!labels.length) return <Text style={s.empty}>Chưa có dữ liệu doanh thu.</Text>;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <View style={[s.chart, { minWidth: labels.length * 64 }]}>
      <View pointerEvents="none" style={s.grid}>{[0, 1, 2, 3].map(index => <View key={index} style={s.gridLine}/>)}</View>
      {labels.map((label, index) => <View key={`${index}-${label}`} style={s.column} accessible accessibilityLabel={`${label}: ${numbers[index].toLocaleString('vi-VN')} triệu đồng`}>
        <View style={s.track}><Text style={s.value}>{numbers[index].toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</Text><View style={[s.bar, { height: numbers[index] / maximum * 150, minHeight: numbers[index] > 0 ? 2 : 0 }]}/></View>
        <Text style={s.label} numberOfLines={1}>{label}</Text>
      </View>)}
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingTop: 12, paddingBottom: 10 }, chart: { flex: 1, flexDirection: 'row', height: 210, position: 'relative' },
  grid: { position: 'absolute', top: 24, bottom: 28, left: 0, right: 0, justifyContent: 'space-between' }, gridLine: { borderTopWidth: 1, borderColor: COLORS.border },
  column: { flex: 1, paddingHorizontal: 8, alignItems: 'center' }, track: { height: 182, width: '100%', alignItems: 'center', justifyContent: 'flex-end' }, bar: { width: '65%', maxWidth: 56, backgroundColor: COLORS.primary, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  value: { color: COLORS.primary,  marginBottom: 6 , fontSize: 12 }, label: { color: COLORS.muted,  marginTop: 10 , fontSize: 12 }, empty: { color: COLORS.muted, paddingVertical: 30, textAlign: 'center' },
});
