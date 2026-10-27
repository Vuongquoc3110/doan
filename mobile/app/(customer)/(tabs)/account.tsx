import {AppAlert as Alert} from '../../../src/utils/alert';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/useAuthStore';
import { formatVnd } from '../../../src/utils/format';
import { useBreakpoint } from '../../../src/hooks/useBreakpoint';
import CustomerPageIntro from '../../../src/components/CustomerPageIntro';
import COLORS from '../../../src/theme/colors';

export default function AccountScreen() {
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
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

  const tierColors: Record<string, { bg: string; text: string; label: string }> = {
    diamond: { bg: '#E0F2FE', text: '#0369A1', label: 'VIP KIM CƯƠNG' },
    gold: { bg: '#FEF3C7', text: '#B45309', label: 'VIP VÀNG' },
    silver: { bg: '#F1F5F9', text: '#475569', label: 'THÀNH VIÊN BẠC' },
    bronze: { bg: '#FFEDD5', text: '#C2410C', label: 'THÀNH VIÊN MỚI' },
  };

  const currentTier = tierColors[user?.tier || 'bronze'] || tierColors.bronze;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <CustomerPageIntro title="Tài khoản của bạn" subtitle="Quản lý đơn hàng, khám phá ưu đãi và tận hưởng quyền lợi thành viên."/>
      <View style={[styles.sections, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }]}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        {isAuthenticated && user ? (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person-outline" size={30} color="#e4ebce"/>
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.userName}>{user.fullName}</Text>
                <Text style={styles.userPhone}>{user.phone}</Text>
                <View style={[styles.tierBadge, { backgroundColor: currentTier.bg }]}>
                  <Text style={[styles.tierBadgeText, { color: currentTier.text }]}>
                    {currentTier.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Loyalty Points Strip */}
            <View style={styles.pointsStrip}>
              <View style={styles.pointBlock}>
                <Text style={styles.pointLabel}>Điểm tích lũy Klever</Text>
                <Text style={styles.pointValue}>{Number(user.points ?? 0).toLocaleString('vi-VN')} điểm</Text>
              </View>
              <View style={styles.pointDivider} />
              <View style={styles.pointBlock}>
                <Text style={styles.pointLabel}>Giá trị quy đổi</Text>
                <Text style={styles.pointValue}>{formatVnd(Number(user.points ?? 0) * 1000)}</Text>
              </View>
            </View>

            {/* Role switchers for Staff and Admin */}
            {user.role === 'staff' && (
              <TouchableOpacity
                style={styles.roleSwitchBtn}
                onPress={() => router.replace('/(staff)')}
              >
                <Ionicons name="briefcase" size={18} color={COLORS.white} />
                <Text style={styles.roleSwitchText}>Vào Cổng Nghiệp Vụ Nhân Viên (Staff)</Text>
              </TouchableOpacity>
            )}

            {user.role === 'admin' && (
              <TouchableOpacity
                style={[styles.roleSwitchBtn, { backgroundColor: COLORS.goldDark }]}
                onPress={() => router.replace('/(admin)')}
              >
                <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
                <Text style={styles.roleSwitchText}>Vào Cổng Quản Trị Hệ Thống (Admin)</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.guestBox}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person" size={32} color={COLORS.muted} />
            </View>
            <View style={styles.guestTextContainer}>
              <Text style={styles.guestTitle}>Chào mừng quý khách!</Text>
              <Text style={styles.guestSubtitle}>Đăng nhập để tích điểm và nhận ưu đãi 50.000₫</Text>
            </View>
            <TouchableOpacity
              style={styles.loginNowBtn}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginNowText}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Order Status Section */}
      <View style={[styles.menuSection, { width: '100%' }]}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeader}>ĐƠN HÀNG CỦA TÔI</Text>
          <TouchableOpacity onPress={() => router.push('/(customer)/orders')}>
            <Text style={styles.viewAllText}>Lịch sử đơn →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orderQuickActions}>
          <TouchableOpacity
            style={styles.quickOrderBtn}
            onPress={() => router.push('/(customer)/orders')}
          >
            <Ionicons name="time-outline" size={24} color={COLORS.purpleDark} />
            <Text style={styles.quickOrderLabel}>Chờ xác nhận</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickOrderBtn}
            onPress={() => router.push('/(customer)/orders')}
          >
            <Ionicons name="cube-outline" size={24} color={COLORS.purpleDark} />
            <Text style={styles.quickOrderLabel}>Đang xử lý</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickOrderBtn}
            onPress={() => router.push('/(customer)/orders')}
          >
            <Ionicons name="bicycle-outline" size={24} color={COLORS.purpleDark} />
            <Text style={styles.quickOrderLabel}>Đang giao</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickOrderBtn}
            onPress={() => router.push('/(customer)/orders')}
          >
            <Ionicons name="checkmark-done-circle-outline" size={24} color={COLORS.purpleDark} />
            <Text style={styles.quickOrderLabel}>Đã giao</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Menu Links */}
      <View style={[styles.menuSection, isDesktop && { width: '48.8%', flexGrow: 1 }]}>
        <Text style={styles.sectionHeader}>DỊCH VỤ & TIỆN ÍCH</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/stores')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="business" size={18} color="#0284C7" />
          </View>
          <Text style={styles.menuItemTitle}>Hệ thống cửa hàng VQ FRUIT</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/vouchers')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="ticket" size={18} color="#D97706" />
          </View>
          <Text style={styles.menuItemTitle}>Ví ưu đãi & Mã giảm giá</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/wishlist')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="heart" size={18} color="#DB2777" />
          </View>
          <Text style={styles.menuItemTitle}>Sản phẩm yêu thích</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/articles')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="book" size={18} color={COLORS.purple} />
          </View>
          <Text style={styles.menuItemTitle}>Cẩm nang & Kiến thức trái cây</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionHeader}>CHÍNH SÁCH & HỖ TRỢ</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/policy')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
          </View>
          <Text style={styles.menuItemTitle}>Chính sách đổi trả trong 48H</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/feedback')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#FFEDD5' }]}>
            <Ionicons name="chatbubbles" size={18} color="#EA580C" />
          </View>
          <Text style={styles.menuItemTitle}>Góp ý chất lượng phục vụ</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(customer)/recruitment')}
        >
          <View style={[styles.menuIconBg, { backgroundColor: '#F3E8FF' }]}>
            <Ionicons name="people" size={18} color="#9333EA" />
          </View>
          <Text style={styles.menuItemTitle}>Tuyển dụng nhân sự</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>


      </View>

      </View>
      {/* Logout button */}
      {isAuthenticated && <TouchableOpacity style={[styles.menuSection, { marginTop: 20, minHeight: 64 }]} onPress={() => router.push('/change-password')}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}><Ionicons name="lock-closed-outline" size={22} color={COLORS.text}/><Text style={{fontSize: 16, fontWeight: '600', color: COLORS.text}}>Đổi mật khẩu</Text><Ionicons name="chevron-forward" size={18} color={COLORS.muted}/></View>
      </TouchableOpacity>}
      {isAuthenticated && (
        <TouchableOpacity style={[styles.logoutBtn, {marginTop: 16}]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.redSale} style={{ marginRight: 6 }} />
          <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.versionText}>VQ FRUIT v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sections: { gap: 20, alignItems: 'stretch' },
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxWidth: 1440, alignSelf: 'center' },
  profileCard: {
    width: '100%',
    backgroundColor: '#183e32',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 0,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ffffff15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  avatarEmoji: { fontSize: 28 },
  profileDetails: { marginLeft: 14, flex: 1 },
  userName: { fontSize: 28, fontWeight: '600', color: '#fff' },
  userPhone: { fontSize: 14, color: '#c3d3c8', marginTop: 2 },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  tierBadgeText: { fontSize: 10, fontWeight: '800' },
  pointsStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.purpleLight,
    borderRadius: 10,
    padding: 22,
    marginTop: 24,
    alignItems: 'center',
  },
  pointBlock: { flex: 1, alignItems: 'center' },
  pointLabel: { fontSize: 12, color: COLORS.muted },
  pointValue: { fontSize: 28, fontWeight: '800', color: COLORS.purpleDark, marginTop: 2 },
  pointDivider: { width: 1, height: 36, backgroundColor: '#cbd6bf' },
  roleSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  roleSwitchText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  guestBox: { flexWrap: 'wrap', gap: 12, flexDirection: 'row', alignItems: 'center' },
  guestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTextContainer: { flex: 1, minWidth: 170, marginLeft: 12 },
  guestTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
  guestSubtitle: { fontSize: 13, color: '#d1ded4', marginTop: 2 },
  loginNowBtn: { backgroundColor: COLORS.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  loginNowText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  menuSection: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 17, fontWeight: '600', color: COLORS.text, letterSpacing: 0 },
  viewAllText: { fontSize: 14, fontWeight: '700', color: COLORS.purple },
  orderQuickActions: { flexWrap: 'wrap', gap: 8, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
  quickOrderBtn: { alignItems: 'center', flex: 1, minWidth: 100, minHeight: 112, paddingVertical: 24, borderRadius: 12, backgroundColor: '#f7f8f2' },
  quickOrderLabel: { fontSize: 14, color: COLORS.text, marginTop: 6, fontWeight: '500' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBg: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemTitle: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 20,
  },
  logoutBtnText: { color: COLORS.redSale, fontSize: 13, fontWeight: '700' },
  versionText: { fontSize: 11, color: COLORS.muted, textAlign: 'center', marginBottom: 10 },
});
