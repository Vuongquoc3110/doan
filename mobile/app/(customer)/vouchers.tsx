import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd, formatDate } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';

export default function VouchersScreen() {
  const router = useRouter();

  const { data: vouchers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['vouchers'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/coupons');
      return res.data?.data || [];
    },
  });

  const handleCopyCode = (code: string) => {
    router.push({ pathname: '/(customer)/checkout', params: { coupon: code } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <Ionicons name="gift" size={24} color={COLORS.gold} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.bannerTitle}>KLEVER REWARDS & VOUCHER</Text>
          <Text style={styles.bannerDesc}>Ưu đãi độc quyền dành cho khách hàng mua sắm qua App</Text>
        </View>
      </View>

      <FlatList
        data={vouchers}
        ListEmptyComponent={<View style={{ padding: 20 }}><Text>{isLoading ? 'Đang tải ưu đãi…' : isError ? 'Chưa tải được ưu đãi.' : 'Hiện chưa có ưu đãi còn hiệu lực.'}</Text>{isError && <TouchableOpacity onPress={() => refetch()}><Text>Thử lại</Text></TouchableOpacity>}</View>}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.voucherCard}>
            <View style={styles.leftCol}>
              <Text style={styles.voucherIcon}>🎟️</Text>
              <Text style={styles.discountValue}>
                {item.type === 'percent' ? `${item.value}%` : formatVnd(item.value)}
              </Text>
            </View>

            <View style={styles.dashDivider} />

            <View style={styles.rightCol}>
              <Text style={styles.voucherName}>Ưu đãi {item.code}</Text>
              <Text style={styles.voucherCond}>
                Đơn tối thiểu: {formatVnd(item.min_order || 0)}
              </Text>
              <Text style={styles.voucherExp}>Hạn dùng: {formatDate(item.expires_at)}</Text>

              <View style={styles.actionRow}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => handleCopyCode(item.code)}
                >
                  <Text style={styles.copyBtnText}>Dùng mã</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleDark,
    padding: 16,
  },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: COLORS.gold },
  bannerDesc: { fontSize: 11, color: '#D1C4E9', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 30 },
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  leftCol: {
    width: 100,
    backgroundColor: COLORS.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  voucherIcon: { fontSize: 24, marginBottom: 4 },
  discountValue: { fontSize: 13, fontWeight: '900', color: COLORS.purpleDark, textAlign: 'center' },
  dashDivider: { width: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D8B4FE' },
  rightCol: { flex: 1, padding: 12, justifyContent: 'space-between' },
  voucherName: { fontSize: 13, fontWeight: '800', color: COLORS.text, lineHeight: 18 },
  voucherCond: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  voucherExp: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  codeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  codeText: { fontSize: 11, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  copyBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  copyBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
});
