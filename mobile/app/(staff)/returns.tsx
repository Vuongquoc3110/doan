import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  
  RefreshControl} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { formatDateTime } from '../../src/utils/format';
import { resolveMediaUrl } from '../../src/utils/media';
import COLORS from '../../src/theme/colors';

export default function StaffReturnsScreen() {
  const {
    data: returns = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['staff-returns'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/staff/returns');
      return res.data?.data || [];
    },
  });

  const handleProcessReturn = (returnId: number, status: 'approved_exchange' | 'approved_refund' | 'rejected') => {
    const actionLabel =
      status === 'approved_exchange'
        ? 'Duyệt đổi hàng mới'
        : status === 'approved_refund'
        ? 'Duyệt hoàn lại tiền'
        : 'Từ chối yêu cầu';

    Alert.alert('Xác nhận xử lý', `Bạn có chắc muốn thực hiện: "${actionLabel}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          try {
            await apiClient.put(`/v1/staff/returns/${returnId}`, {
              status: status === 'rejected' ? 'rejected' : 'approved',
              resolution: status === 'approved_exchange' ? 'exchange' : 'refund',
              note: `Nhân viên cửa hàng xác nhận xử lý: ${actionLabel}`,
            });
            Alert.alert('Thành công', `Đã cập nhật trạng thái: ${actionLabel}`);
            refetch();
          } catch (err: any) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể xử lý yêu cầu đổi trả');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.purple} />
          <Text style={styles.loadingText}>Đang tải danh sách yêu cầu đổi trả...</Text>
        </View>
      ) : returns.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyEmoji}>🛡️</Text>
          <Text style={styles.emptyTitle}>Không có khiếu nại đổi trả nào</Text>
          <Text style={styles.emptySub}>Cửa hàng hiện tại không có khiếu nại nào cần giải quyết.</Text>
        </View>
      ) : (
        <FlatList
          data={returns}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={async () => { await refetch(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderCode}>Đơn #{item.order_code || item.order_id}</Text>
                  <Text style={styles.dateText}>{formatDateTime(item.created_at)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === 'pending'
                          ? '#FEF3C7'
                          : item.status.includes('approved')
                          ? '#DCFCE7'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          item.status === 'pending'
                            ? '#B45309'
                            : item.status.includes('approved')
                            ? COLORS.greenCheck
                            : COLORS.redSale,
                      },
                    ]}
                  >
                    {item.status === 'pending'
                      ? 'CHỜ DUYỆT'
                      : item.status === 'approved_exchange'
                      ? 'ĐÃ DUYỆT ĐỔI MỚI'
                      : item.status === 'approved'
                      ? 'ĐÃ DUYỆT HOÀN TIỀN'
                      : 'ĐÃ TỪ CHỐI'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.reasonTitle}>
                Lý do: <Text style={styles.bold}>{item.reason}</Text>
              </Text>
              {item.description && (
                <Text style={styles.descText}>Mô tả của khách: "{item.description}"</Text>
              )}

              {/* Evidence photos */}
              {item.images && item.images.length > 0 && (
                <View style={styles.imagesRow}>
                  {item.images.map((uri: string, idx: number) => (
                    <Image key={idx} source={{ uri: resolveMediaUrl(uri) }} style={styles.evidenceThumb} />
                  ))}
                </View>
              )}

              {item.refund_bank_info && (
                <View style={styles.bankBox}>
                  <Text style={styles.bankText}>Tài khoản nhận hoàn tiền: {item.refund_bank_info}</Text>
                </View>
              )}

              {/* Actions for pending return requests */}
              {item.status === 'pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnExchange]}
                    onPress={() => handleProcessReturn(item.id, 'approved_exchange')}
                  >
                    <Ionicons name="repeat" size={16} color={COLORS.white} />
                    <Text style={styles.btnActionText}>Duyệt Đổi Mới</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnRefund]}
                    onPress={() => handleProcessReturn(item.id, 'approved_refund')}
                  >
                    <Ionicons name="cash" size={16} color={COLORS.white} />
                    <Text style={styles.btnActionText}>Hoàn Tiền</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnReject]}
                    onPress={() => handleProcessReturn(item.id, 'rejected')}
                  >
                    <Ionicons name="close" size={16} color={COLORS.redSale} />
                    <Text style={[styles.btnActionText, { color: COLORS.redSale }]}>Từ chối</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  listContent: { padding: 14, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCode: { fontSize: 14, fontWeight: '800', color: COLORS.purpleDark },
  dateText: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  reasonTitle: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  bold: { fontWeight: '700' },
  descText: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', marginBottom: 8 },
  imagesRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  evidenceThumb: { width: 70, height: 70, borderRadius: 6, backgroundColor: '#F3F4F6' },
  bankBox: { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 6, marginTop: 6 },
  bankText: { fontSize: 11, color: '#1E40AF', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  btnExchange: { backgroundColor: COLORS.purple },
  btnRefund: { backgroundColor: COLORS.greenCheck },
  btnReject: { backgroundColor: '#FEE2E2', flex: 0.7 },
  btnActionText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.muted },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  emptySub: { fontSize: 12, color: COLORS.muted },
});
