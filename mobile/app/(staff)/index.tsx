import {AppAlert as Alert} from '../../src/utils/alert';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  
  RefreshControl} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { formatVnd } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';

export default function StaffHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const {
    data: overview,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['staff-shift-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/staff/shift-overview');
      return res.data?.data;
    },
  });

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi cổng nhân viên?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
    >
      {/* Staff & Shift Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={54} color={COLORS.purpleDark} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.staffName}>{user?.fullName || 'Nhân Viên Klever'}</Text>
            <Text style={styles.staffRole}>Vị trí: Nhân viên tư vấn & Thu ngân</Text>
            <View style={styles.storeBadge}>
              <Ionicons name="storefront" size={12} color={COLORS.purpleDark} />
              <Text style={styles.storeBadgeText}>
                {user?.store_name || 'VQ FRUIT 63 Yên Lãng'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.shiftBox}>
          <View style={styles.shiftItem}>
            <Text style={styles.shiftLabel}>Ca làm việc:</Text>
            <Text style={styles.shiftValue}>Ca Sáng (07:30 - 15:30)</Text>
          </View>
          <View style={styles.shiftDivider} />
          <View style={styles.shiftItem}>
            <Text style={styles.shiftLabel}>Trạng thái:</Text>
            <Text style={[styles.shiftValue, { color: COLORS.greenCheck, fontWeight: '800' }]}>
              ✓ Đang trực ca
            </Text>
          </View>
        </View>
      </View>

      {/* KPI Stats Grid */}
      <Text style={styles.sectionTitle}>TỔNG QUAN CA TRỰC HÔM NAY</Text>
      {isLoading ? (
        <ActivityIndicator color={COLORS.purple} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: COLORS.redSale }]}
            onPress={() => router.push('/(staff)/orders')}
          >
            <Text style={styles.statNumber}>{overview?.pendingOrders ?? 0}</Text>
            <Text style={styles.statLabel}>Đơn mới cần chuẩn bị</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: COLORS.purple }]}
            onPress={() => router.push('/(staff)/orders')}
          >
            <Text style={styles.statNumber}>{overview?.processingOrders ?? 0}</Text>
            <Text style={styles.statLabel}>Đang đóng gói giỏ/hộp</Text>
          </TouchableOpacity>

          <View style={[styles.statCard, { borderLeftColor: COLORS.gold }]}>
            <Text style={styles.statNumber}>
              {formatVnd(overview?.todayRevenue ?? 0)}
            </Text>
            <Text style={styles.statLabel}>Doanh thu tại quầy</Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, { borderLeftColor: '#0284C7' }]}
            onPress={() => router.push('/(staff)/returns')}
          >
            <Text style={styles.statNumber}>{overview?.pendingReturns ?? 0}</Text>
            <Text style={styles.statLabel}>Yêu cầu đổi trả (48h)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Operations Quick Menu */}
      <Text style={styles.sectionTitle}>NGHIỆP VỤ BÁN HÀNG & CỬA HÀNG</Text>
      <View style={styles.actionMenu}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/(staff)/pos')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="calculator" size={24} color={COLORS.redSale} />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>POS Bán Hàng & Tính Tiền Tại Quầy</Text>
            <Text style={styles.actionSubtitle}>
              Tạo đơn nhanh, tích điểm SĐT khách hàng, quét VietQR
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/(staff)/orders')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="receipt" size={24} color={COLORS.purple} />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Quản Lý Đơn Hàng Cửa Hàng</Text>
            <Text style={styles.actionSubtitle}>
              Nhận đơn online, chuẩn bị hoa quả, bàn giao shipper
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/(staff)/inventory')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cube" size={24} color={COLORS.goldDark} />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Kiểm Kê Tồn Kho & Báo Hỏng</Text>
            <Text style={styles.actionSubtitle}>
              Cập nhật số lượng nhập mới, ghi nhận trái cây dập hỏng
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/(staff)/returns')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.greenCheck} />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Xử Lý Đổi Trả Trong 48H</Text>
            <Text style={styles.actionSubtitle}>
              Kiểm tra hình ảnh khiếu nại của khách, duyệt đổi mới
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/(staff)/attendance')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="finger-print" size={24} color="#0284C7" />
          </View>
          <View style={styles.actionDetails}>
            <Text style={styles.actionTitle}>Chấm Công & Điểm Danh GPS</Text>
            <Text style={styles.actionSubtitle}>Xác nhận vào ca, tan ca tại vị trí cửa hàng</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Switch to Customer Portal */}
      <TouchableOpacity
        style={styles.switchPortalBtn}
        onPress={() => router.replace('/(customer)/(tabs)')}
      >
        <Ionicons name="swap-horizontal" size={18} color={COLORS.purpleDark} />
        <Text style={styles.switchPortalText}>Xem Giao Diện Khách Hàng (Customer)</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.redSale} style={{ marginRight: 6 }} />
        <Text style={styles.logoutBtnText}>Đăng xuất khỏi cổng nhân viên</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: 12 },
  profileInfo: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  staffRole: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  storeBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.purpleDark },
  shiftBox: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    alignItems: 'center',
  },
  shiftItem: { flex: 1, alignItems: 'center' },
  shiftLabel: { fontSize: 11, color: COLORS.muted },
  shiftValue: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  shiftDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB' },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.muted, marginBottom: 10, letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  statNumber: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  actionMenu: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionDetails: { flex: 1 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  actionSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  switchPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purpleLight,
    borderWidth: 1,
    borderColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  switchPortalText: { fontSize: 12, fontWeight: '700', color: COLORS.purpleDark },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 12,
  },
  logoutBtnText: { color: COLORS.redSale, fontSize: 12, fontWeight: '700' },
});
