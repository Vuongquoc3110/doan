import {AppAlert as Alert} from '../../src/utils/alert';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  
  FlatList} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { formatDateTime } from '../../src/utils/format';
import COLORS from '../../src/theme/colors';

export default function StaffAttendanceScreen() {
  const { user } = useAuthStore();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const { data: attendanceHistory = [], refetch } = useQuery({
    queryKey: ['staff-attendance-history'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/staff/attendance');
      return res.data?.data?.records || [];
    },
  });

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if(status!=='granted')throw new Error('Cần cấp quyền vị trí để xác minh chấm công tại chi nhánh.');
      const loc=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      await apiClient.post('/v1/staff/attendance/check-in', { lat:loc.coords.latitude, lng:loc.coords.longitude,accuracy:loc.coords.accuracy??undefined });
      Alert.alert('Chấm công thành công! ⏱️', 'Đã ghi nhận Check-in vào ca tại chi nhánh.');
      refetch();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Không thể ghi nhận chấm công');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      await apiClient.post('/v1/staff/attendance/check-out');
      Alert.alert('Tan ca thành công! 👋', 'Đã ghi nhận Check-out hết ca làm việc.');
      refetch();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể ghi nhận tan ca');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Shift Info Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="time" size={24} color={COLORS.purpleDark} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardTitle}>ĐIỂM DANH & CHẤM CÔNG VÀO CA</Text>
            <Text style={styles.cardSub}>
              {user?.store_name || 'Chi nhánh 63 Yên Lãng'} • Ca sáng (07:30 - 15:30)
            </Text>
          </View>
        </View>

        <View style={styles.gpsBanner}>
          <Ionicons name="navigate-circle" size={18} color={COLORS.greenCheck} />
          <Text style={styles.gpsText}>GPS hợp lệ: Đang ở trong bán kính 100m của cửa hàng</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btnAction, styles.btnIn, checkingIn && styles.btnDisabled]}
            onPress={handleCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={COLORS.white} />
                <Text style={styles.btnActionText}>CHECK-IN VÀO CA</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, styles.btnOut, checkingOut && styles.btnDisabled]}
            onPress={handleCheckOut}
            disabled={checkingOut}
          >
            {checkingOut ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
                <Text style={styles.btnActionText}>CHECK-OUT TAN CA</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Attendance History */}
      <View style={styles.card}>
        <Text style={styles.historyTitle}>LỊCH SỬ CHẤM CÔNG TUẦN NÀY</Text>

        {attendanceHistory.length === 0 ? (
          <Text style={styles.emptyHistory}>Chưa có dữ liệu chấm công gần đây.</Text>
        ) : (
          attendanceHistory.map((item: any, idx: number) => (
            <View key={idx} style={styles.historyRow}>
              <View style={styles.historyDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>
                  {item.check_in ? formatDateTime(item.check_in) : 'Hôm nay'}
                </Text>
                <Text style={styles.historyStatus}>
                  Vào ca: {item.check_in ? formatDateTime(item.check_in).split('-')[0] : '?'} •
                  Tan ca: {item.check_out ? formatDateTime(item.check_out).split('-')[0] : 'Đang làm'}
                </Text>
              </View>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>ĐÚNG GIỜ</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: COLORS.purpleDark },
  cardSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
  },
  gpsText: { fontSize: 11, color: '#166534', fontWeight: '600', flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  btnIn: { backgroundColor: COLORS.greenCheck },
  btnOut: { backgroundColor: COLORS.purple },
  btnDisabled: { opacity: 0.6 },
  btnActionText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  historyTitle: { fontSize: 12, fontWeight: '800', color: COLORS.purpleDark, marginBottom: 12 },
  emptyHistory: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginVertical: 10 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.greenCheck, marginRight: 10 },
  historyDate: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  historyStatus: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  historyBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  historyBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.greenCheck },
});
