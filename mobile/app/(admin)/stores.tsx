import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  
  Switch,
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatVnd } from '../../src/utils/format';
import COLORS from '../../src/theme/admin';

export default function AdminStoresScreen() {
  const [cityFilter, setCityFilter] = useState<string>('all');

  const {
    data: allStores = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-stores-management'],
    queryFn: async () => {
      const params: any = {};

      const res = await apiClient.get('/v1/admin/stores', { params });
      return res.data?.data || [];
    },
  });

  const cities = Array.from(new Set<string>(allStores.map((store: any) => store.city).filter(Boolean)));
  const stores = allStores.filter((store: any) => cityFilter === 'all' || store.city === cityFilter);

  const handleToggleStoreStatus = async (storeId: number, currentStatus: boolean, storeName: string) => {
    try {
      await apiClient.put(`/v1/admin/stores/${storeId}/status`, {
        is_active: !currentStatus,
      });
      Alert.alert(
        'Thành công',
        `Chi nhánh "${storeName}" đã được ${!currentStatus ? 'KÍCH HOẠT' : 'TẠM DỪNG HOẠT ĐỘNG'}.`
      );
      refetch();
    } catch {
      Alert.alert('Lỗi', 'Không thể đổi trạng thái chi nhánh');
    }
  };

  return (
    <View style={styles.container}>
      {/* City Filter Tabs */}
      <View style={styles.tabBar}>
        {['all', ...cities].map(city => <TouchableOpacity key={city} accessibilityRole="button" accessibilityState={{selected: cityFilter === city}} style={[styles.tab, cityFilter === city && styles.tabActive]} onPress={() => setCityFilter(city)}><Text style={[styles.tabText, cityFilter === city && styles.tabTextActive]}>{city === 'all' ? 'Tất cả' : city} ({city === 'all' ? allStores.length : allStores.filter((store: any) => store.city === city).length})</Text></TouchableOpacity>)}
      </View>

      {/* Stores List */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách chi nhánh...</Text>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => {
            const isActive = item.is_active !== 0 && item.is_active !== false;

            return (
              <View style={[styles.card, !isActive && styles.cardInactive]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <Text style={styles.locationSub}>
                      {item.district}, {item.city}
                    </Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={() => handleToggleStoreStatus(item.id, isActive, item.name)}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={isActive ? COLORS.greenCheck : '#9CA3AF'}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Ionicons name="location-outline" size={14} color={COLORS.muted} />
                  <Text style={styles.rowText}>{item.address}</Text>
                </View>

                <View style={styles.row}>
                  <Ionicons name="call-outline" size={14} color={COLORS.muted} />
                  <Text style={styles.rowText}>Hotline: {item.phone}</Text>
                </View>

                <View style={styles.revenueBox}>
                  <Text style={styles.revenueLabel}>Doanh thu ghi nhận:</Text>
                  <Text style={styles.revenueVal}>
                    {formatVnd(item.today_revenue ?? 0)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  tab: { flex: 1, paddingVertical: 6,  backgroundColor: COLORS.inputBg, alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.purpleLight, borderWidth: 1, borderColor: COLORS.purple },
  tabText: {  color: COLORS.muted, fontWeight: '600' , fontSize: 12 },
  tabTextActive: { color: COLORS.purpleDark, fontWeight: '700' },
  listContent: {   padding: 20, paddingBottom: 40, gap: 8 },
  card: {
    backgroundColor: COLORS.card,
    
    
    marginBottom: 10,
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  cardInactive: { opacity: 0.65, backgroundColor: '#F9FAFB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: {  fontWeight: '800', color: COLORS.text , fontSize: 14 },
  locationSub: {  color: COLORS.purple, marginTop: 2, fontWeight: '600' , fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rowText: {  color: COLORS.muted, flex: 1 , fontSize: 12 },
  revenueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.purpleLight,
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  revenueLabel: {  color: COLORS.purpleDark, fontWeight: '600' , fontSize: 12 },
  revenueVal: {  color: COLORS.purpleDark, fontWeight: '800' , fontSize: 14 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12,  color: COLORS.muted , fontSize: 14 },
});
