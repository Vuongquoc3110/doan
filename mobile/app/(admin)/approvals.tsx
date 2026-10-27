import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatDateTime } from '../../src/utils/format';
import COLORS from '../../src/theme/admin';
import {ReturnResolutionControls} from '../../src/components/ReturnResolutionControls';

export default function AdminApprovalsScreen() {
  const [activeTab, setActiveTab] = useState<'returns' | 'reviews'>('returns');

  // Fetch pending return refunds
  const {
    data: returns = [],
    isLoading: loadingReturns,
    refetch: refetchReturns,
    isRefetching: isRefetchingReturns,
  } = useQuery({
    queryKey: ['admin-approvals-returns'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/admin/approvals/returns');
      return res.data?.data || [];
    },
  });

  // Fetch pending reviews
  const {
    data: reviews = [],
    isLoading: loadingReviews,
    refetch: refetchReviews,
    isRefetching: isRefetchingReviews,
  } = useQuery({
    queryKey: ['admin-approvals-reviews'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/admin/approvals/reviews');
      return res.data?.data || [];
    },
  });

  const handleApproveRefund = async (returnId: number) => {
    Alert.alert('Xác nhận hoàn tiền', 'Xác nhận duyệt lệnh hoàn tiền và chuyển khoản cho khách hàng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Duyệt hoàn tiền',
        onPress: async () => {
          try {
            await apiClient.post(`/v1/admin/approvals/returns/${returnId}/approve-refund`);
            Alert.alert('Thành công', 'Đã duyệt lệnh chuyển khoản hoàn tiền thành công.');
            refetchReturns();
          } catch (err: any) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể phê duyệt hoàn tiền');
          }
        },
      },
    ]);
  };

  const handleApproveReview = async (reviewId: number, isApproved: boolean) => {
    try {
      await apiClient.put(`/v1/admin/approvals/reviews/${reviewId}`, { is_approved: isApproved });
      Alert.alert('Thành công', isApproved ? 'Đã duyệt hiển thị đánh giá' : 'Đã ẩn đánh giá');
      refetchReviews();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đánh giá');
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'returns' && styles.tabActive]}
          onPress={() => setActiveTab('returns')}
        >
          <Text style={[styles.tabText, activeTab === 'returns' && styles.tabTextActive]}>
            Hoàn Tiền Đổi Trả ({returns.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
            Duyệt Đánh Giá ({reviews.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'returns' ? (
        loadingReturns ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>Đang tải danh sách hoàn tiền...</Text>
          </View>
        ) : returns.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyEmoji}>✓</Text>
            <Text style={styles.emptyTitle}>Tất cả yêu cầu đã được xử lý</Text>
            <Text style={styles.emptySub}>Không có yêu cầu hoàn tiền nào đang chờ duyệt.</Text>
          </View>
        ) : (
          <FlatList
            data={returns}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetchingReturns} onRefresh={async () => { await refetchReturns(); }} />
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.codeText}>Đơn #{item.order_code || item.order_id}</Text>
                  <Text style={styles.dateText}>{formatDateTime(item.created_at)}</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.reasonText}>
                  Lý do: <Text style={styles.bold}>{item.reason}</Text>
                </Text>
                <Text style={styles.descText}>Chi tiết: "{item.description || 'Không có mô tả'}"</Text>

                {item.refund_bank_info && (
                  <View style={styles.bankBox}>
                    <Text style={styles.bankLabel}>Thông tin thụ hưởng:</Text>
                    <Text style={styles.bankVal}>{item.refund_bank_info}</Text>
                  </View>
                )}

                <ReturnResolutionControls request={item} onSaved={()=>refetchReturns()}/>
              </View>
            )}
          />
        )
      ) : loadingReviews ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>Không có đánh giá chờ duyệt</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetchingReviews} onRefresh={async () => { await refetchReviews(); }} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.codeText}>{item.user_name || 'Khách hàng'}</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= item.rating ? 'star' : 'star-outline'}
                      size={14}
                      color={COLORS.gold}
                    />
                  ))}
                </View>
              </View>

              <Text style={styles.prodName}>{item.product_name}</Text>
              <Text style={styles.reviewComment}>"{item.comment}"</Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.hideBtn}
                  onPress={() => handleApproveReview(item.id, false)}
                >
                  <Text style={styles.hideBtnText}>Ẩn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => handleApproveReview(item.id, true)}
                >
                  <Text style={styles.showBtnText}>Duyệt Hiển Thị</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  tab: { flex: 1, paddingVertical: 8,  backgroundColor: COLORS.inputBg, alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.purpleLight, borderWidth: 1, borderColor: COLORS.purple },
  tabText: {  color: COLORS.muted, fontWeight: '600' , fontSize: 12 },
  tabTextActive: { color: COLORS.purpleDark, fontWeight: '800' },
  listContent: {   padding: 20, paddingBottom: 40, gap: 8 },
  card: {
    backgroundColor: COLORS.card,
    
    
    marginBottom: 10,
    
     borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#dfe8e3' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeText: {  fontWeight: '800', color: COLORS.purpleDark , fontSize: 14 },
  dateText: {  color: COLORS.muted , fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  reasonText: {  color: COLORS.text, marginBottom: 2 , fontSize: 14 },
  descText: {  color: COLORS.muted, fontStyle: 'italic', marginBottom: 6 , fontSize: 12 },
  bold: { fontWeight: '700' },
  bankBox: { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 6, marginBottom: 10 },
  bankLabel: {  color: '#1E40AF', fontWeight: '700' , fontSize: 12 },
  bankVal: {  color: '#1E40AF', marginTop: 2 , fontSize: 12 },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    
    backgroundColor: COLORS.greenCheck,
    paddingVertical: 10,
    
    gap: 6, minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  approveBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 14 },
  starRow: { flexDirection: 'row', gap: 2 },
  prodName: {  fontWeight: '700', color: COLORS.purple, marginTop: 4 , fontSize: 12 },
  reviewComment: {  color: COLORS.text, marginVertical: 8, fontStyle: 'italic' , fontSize: 14 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  hideBtn: { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 8,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  hideBtnText: { color: COLORS.redSale,  fontWeight: '700' , fontSize: 12 },
  showBtn: { flex: 2, backgroundColor: COLORS.purple, paddingVertical: 8,  alignItems: 'center' , minHeight: 44, justifyContent: 'center', borderRadius: 10 },
  showBtnText: { color: COLORS.white,  fontWeight: '800' , fontSize: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12,  color: COLORS.muted , fontSize: 14 },
  emptyEmoji: { fontSize: 44, color: COLORS.greenCheck, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  emptySub: {  color: COLORS.muted, marginTop: 2 , fontSize: 14 },
});
