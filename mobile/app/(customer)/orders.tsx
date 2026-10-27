import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd, formatDateTime } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';

const STATUS_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'READY', label: 'Sẵn sàng giao' },
  { key: 'RETURNED', label: 'Đã đổi trả' },
  { key: 'PREPARING', label: 'Đang chuẩn bị' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Đã hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export default function CustomerOrdersScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState('all');

  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['my-orders', selectedStatus],
    queryFn: async () => {
      const params: any = {};
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const res = await apiClient.get('/v1/orders/my-orders', { params });
      return res.data?.data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Chờ xác nhận', bg: '#FEF3C7', color: '#B45309' };
      case 'CONFIRMED':
      case 'READY':
      case 'PREPARING':
        return { label: 'Đang chuẩn bị', bg: '#EFF6FF', color: '#1D4ED8' };
      case 'SHIPPING':
        return { label: 'Đang giao hàng', bg: '#F3E8FF', color: '#7E22CE' };
      case 'COMPLETED':
        return { label: 'Giao thành công', bg: '#DCFCE7', color: '#15803D' };
      case 'CANCELLED':
        return { label: 'Đã hủy', bg: '#FEE2E2', color: '#B91C1C' };
      case 'RETURNED':
        return { label: 'Đã đổi trả', bg: '#F3F4F6', color: '#4B5563' };
      default:
        return { label: status, bg: '#F3F4F6', color: '#4B5563' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Filter Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }) => {
            const active = selectedStatus === item.key;
            return (
              <TouchableOpacity
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setSelectedStatus(item.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách đơn hàng...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
          <Text style={styles.emptyDesc}>Các đơn hàng của bạn sẽ được hiển thị và theo dõi tại đây.</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => router.push('/(customer)/(tabs)/categories')}
          >
            <Text style={styles.shopBtnText}>Mua Sắm Trái Cây Ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => {
            const statusInfo = getStatusBadge(item.status);
            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => router.push(`/(customer)/order/${item.id}`)}
              >
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderCode}>{item.code}</Text>
                    <Text style={styles.orderDate}>{formatDateTime(item.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDivider} />

                <View style={styles.orderStoreRow}>
                  <Ionicons name="storefront-outline" size={14} color={COLORS.muted} />
                  <Text style={styles.storeNameText} numberOfLines={1}>
                    {item.store_name || 'Chi nhánh VQ FRUIT'}
                  </Text>
                </View>

                <View style={styles.orderRecipientRow}>
                  <Text style={styles.recipientText}>
                    Người nhận: <Text style={styles.bold}>{item.receiver_name}</Text> • {item.receiver_phone}
                  </Text>
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.itemsCount}>
                    {item.items?.reduce((sum: number, line: any) => sum + Number(line.qty), 0) || 0} sản phẩm ({item.delivery_type === 'pickup' ? 'Nhận tại quầy' : 'Giao tận nơi'})
                  </Text>
                  <Text style={styles.orderTotal}>{formatVnd(item.total)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabsContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.inputBg,
  },
  tabBtnActive: { backgroundColor: COLORS.purpleLight, borderWidth: 1, borderColor: COLORS.purple },
  tabText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  tabTextActive: { color: COLORS.purpleDark, fontWeight: '800' },
  listContent: { padding: 16, paddingBottom: 30 },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 14, fontWeight: '800', color: COLORS.purpleDark },
  orderDate: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  orderDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  orderStoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  storeNameText: { fontSize: 12, color: COLORS.muted, flex: 1 },
  orderRecipientRow: { marginBottom: 8 },
  recipientText: { fontSize: 12, color: COLORS.text },
  bold: { fontWeight: '700' },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsCount: { fontSize: 11, color: COLORS.muted },
  orderTotal: { fontSize: 15, fontWeight: '900', color: COLORS.redSale },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  emptyDesc: { fontSize: 12, color: COLORS.muted, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  shopBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  shopBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
