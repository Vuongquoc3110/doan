import {AppAlert as Alert} from '../src/utils/alert';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { getApiBaseUrl, setCustomApiUrl, getAutoDiscoveredServerHost } from '../src/api/config';
import COLORS from '../src/theme/colors';

export default function ConnectionTestScreen() {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [autoHost, setAutoHost] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    const url = await getApiBaseUrl();
    const host = getAutoDiscoveredServerHost();
    setCurrentUrl(url);
    setAutoHost(host);
    setInputUrl(url);
    runTest(url);
  };

  const runTest = async (targetUrl?: string) => {
    const urlToTest = targetUrl || currentUrl;
    if (!urlToTest) return;

    setLoading(true);
    setTestResult(null);
    setErrorMsg(null);

    const startTime = Date.now();
    try {
      const healthUrl = urlToTest.endsWith('/api') ? `${urlToTest}/health` : `${urlToTest}/api/health`;
      const res = await axios.get(healthUrl, { timeout: 6000 });
      const duration = Date.now() - startTime;

      setTestResult({
        duration,
        data: res.data?.data,
        status: res.status,
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      setErrorMsg(
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED'
          ? 'Quá thời gian chờ phản hồi (Timeout). Vui lòng kiểm tra lại địa chỉ IP hoặc Firewall.'
          : err.message || 'Không thể kết nối đến máy chủ backend.')
      );
      setTestResult({ duration, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomUrl = async () => {
    if (!inputUrl.trim()) return;
    try {
      await setCustomApiUrl(inputUrl.trim());
      const updated = await getApiBaseUrl();
      setCurrentUrl(updated);
      Alert.alert('Thành công', 'Đã lưu cấu hình địa chỉ API mới.');
      runTest(updated);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const handleResetDefault = async () => {
    await setCustomApiUrl(null);
    const updated = await getApiBaseUrl();
    setCurrentUrl(updated);
    setInputUrl(updated);
    Alert.alert('Thông báo', 'Đã khôi phục địa chỉ IP tự động phát hiện từ Expo.');
    runTest(updated);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={styles.card}>
        <Text style={styles.title}>CHẨN ĐOÁN KẾT NỐI ĐIỆN THOẠI ↔ SERVER</Text>
        <Text style={styles.subtitle}>
          Kiểm tra thông tuyến REST API giữa ứng dụng Expo Go và máy chủ Backend Node.js
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Expo HostUri:</Text>
          <Text style={styles.infoValue}>
            {Constants.expoConfig?.hostUri || 'Chưa nhận diện qua Expo Go'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>IP Tự Động:</Text>
          <Text style={styles.infoValue}>{autoHost}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API Base URL:</Text>
          <Text style={[styles.infoValue, { color: COLORS.purpleDark, fontWeight: '700' }]}>
            {currentUrl}
          </Text>
        </View>
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={[styles.testButton, loading && styles.buttonDisabled]}
        onPress={() => runTest()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.testButtonText}>🔄 KIỂM TRA KẾT NỐI NGAY (/api/health)</Text>
        )}
      </TouchableOpacity>

      {/* Result Card */}
      {testResult && !testResult.error && (
        <View style={[styles.card, styles.successCard]}>
          <View style={styles.statusBadgeSuccess}>
            <Text style={styles.statusBadgeText}>✔ KẾT NỐI THÀNH CÔNG (200 OK)</Text>
          </View>
          <Text style={styles.resultItem}>
            ⏱ Thời gian phản hồi: <Text style={styles.bold}>{testResult.duration} ms</Text>
          </Text>
          <Text style={styles.resultItem}>
            🖥 Tên máy chủ: <Text style={styles.bold}>{testResult.data?.server?.name}</Text>
          </Text>
          <Text style={styles.resultItem}>
            📦 Phiên bản: <Text style={styles.bold}>{testResult.data?.server?.version}</Text>
          </Text>
          <Text style={styles.resultItem}>
            🗄 Trạng thái Database: <Text style={[styles.bold, { color: COLORS.greenCheck }]}>ĐÃ KẾT NỐI (MySQL 8 / MariaDB)</Text>
          </Text>
          <Text style={styles.resultItem}>
            📊 Dữ liệu có sẵn:{' '}
            <Text style={styles.bold}>
              {testResult.data?.database?.stats?.products} Sản phẩm •{' '}
              {testResult.data?.database?.stats?.stores} Chi nhánh •{' '}
              {testResult.data?.database?.stats?.orders} Đơn hàng
            </Text>
          </Text>
          {testResult.data?.server?.localIps && (
            <Text style={styles.resultItem}>
              📡 Danh sách IP máy tính:{' '}
              <Text style={styles.bold}>{testResult.data.server.localIps.join(', ')}</Text>
            </Text>
          )}
        </View>
      )}

      {/* Error Card */}
      {errorMsg && (
        <View style={[styles.card, styles.errorCard]}>
          <View style={styles.statusBadgeError}>
            <Text style={styles.statusBadgeText}>❌ KHÔNG THỂ KẾT NỐI</Text>
          </View>
          <Text style={styles.errorText}>{errorMsg}</Text>

          <View style={styles.troubleshootBox}>
            <Text style={styles.troubleshootTitle}>HƯỚNG DẪN XỬ LÝ LỖI KẾT NỐI:</Text>
            <Text style={styles.troubleshootStep}>
              1. <Text style={styles.bold}>Cùng mạng Wi-Fi:</Text> Đảm bảo điện thoại và máy tính kết nối vào cùng 1 mạng Wi-Fi (tránh mạng khách cách ly client).
            </Text>
            <Text style={styles.troubleshootStep}>
              2. <Text style={styles.bold}>Tường lửa Windows (Firewall):</Text> Mở Firewall cho cổng 4000 hoặc tắt tạm Private Network Firewall.
            </Text>
            <Text style={styles.troubleshootStep}>
              3. <Text style={styles.bold}>Kiểm tra Server:</Text> Đảm bảo lệnh `npm run server:dev` đang chạy trên máy tính và hiển thị "Listening on 0.0.0.0:4000".
            </Text>
            <Text style={styles.troubleshootStep}>
              4. <Text style={styles.bold}>Nhập IP thủ công:</Text> Gõ lệnh `ipconfig` trên máy tính để lấy địa chỉ IPv4 (ví dụ http://192.168.1.6:4000/api) và lưu vào ô bên dưới.
            </Text>
            <Text style={styles.troubleshootStep}>
              5. <Text style={styles.bold}>Sử dụng Tunnel:</Text> Nếu mạng Wi-Fi chặn kết nối LAN, dùng lệnh `npx expo start --tunnel` hoặc ngrok port 4000.
            </Text>
          </View>
        </View>
      )}

      {/* Manual URL Input Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ĐỔI ĐỊA CHỈ API THỦ CÔNG</Text>
        <Text style={styles.inputHelp}>
          Nhập địa chỉ IP máy tính kèm cổng 4000 (Ví dụ: http://192.168.1.6:4000/api):
        </Text>
        <TextInput
          style={styles.input}
          value={inputUrl}
          onChangeText={setInputUrl}
          placeholder="http://192.168.1.x:4000/api"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveCustomUrl}>
            <Text style={styles.saveButtonText}>Lưu Địa Chỉ Này</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetDefault}>
            <Text style={styles.resetButtonText}>Tự Động</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.purpleDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13, color: COLORS.muted },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  testButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  testButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  successCard: { borderColor: COLORS.greenCheck, backgroundColor: '#F0FDF4' },
  statusBadgeSuccess: {
    backgroundColor: COLORS.greenCheck,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  errorCard: { borderColor: COLORS.redSale, backgroundColor: '#FEF2F2' },
  statusBadgeError: {
    backgroundColor: COLORS.redSale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  resultItem: { fontSize: 13, color: COLORS.text, marginBottom: 6 },
  bold: { fontWeight: '700' },
  errorText: { fontSize: 13, color: COLORS.redSale, fontWeight: '600', marginBottom: 12 },
  troubleshootBox: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  troubleshootTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  troubleshootStep: { fontSize: 12, color: COLORS.text, marginBottom: 6, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  inputHelp: { fontSize: 12, color: COLORS.muted, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
  },
  rowButtons: { flexDirection: 'row', gap: 10 },
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.gold,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: COLORS.purpleDark, fontWeight: '700', fontSize: 13 },
  resetButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
});
