import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal, TextInput, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import COLORS from '../../src/theme/colors';

export default function RecruitmentScreen() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { data: jobPosts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['job-posts'],
    queryFn: async () => {
      const res = await apiClient.get('/v1/job-posts');
      return res.data?.data || [];
    },
  });

  const jobs = jobPosts;

  const handleApply = (job: any) => { setSelectedJob(job); setMessage(''); };
  const submit = async () => {
    if (sending) return;
    if (!name.trim() || !phone.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('Vui lòng nhập họ tên, số điện thoại và email hợp lệ.'); return; }
    setSending(true);
    try { await apiClient.post('/v1/job-applications', { job_id: selectedJob.id, full_name: name.trim(), phone: phone.trim(), email: email.trim(), note: note.trim() }); setSelectedJob(null); setMessage('Đã gửi hồ sơ ứng tuyển thành công.'); }
    catch (e: any) { setMessage(e.response?.data?.message || 'Chưa gửi được hồ sơ, vui lòng thử lại.'); }
    finally { setSending(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GIA NHẬP ĐỘI NGŨ VQ FRUIT</Text>
        <Text style={styles.headerSub}>Môi trường làm việc chuyên nghiệp, đãi ngộ hấp dẫn</Text>
      </View>

      <FlatList
        data={jobs}
        ListHeaderComponent={message ? <Text accessibilityLiveRegion="polite" style={{ padding: 16 }}>{message}</Text> : undefined}
        ListEmptyComponent={<View style={{ padding: 20 }}><Text>{isLoading ? 'Đang tải…' : isError ? 'Chưa tải được vị trí tuyển dụng.' : 'Hiện chưa có vị trí đang tuyển.'}</Text>{isError && <TouchableOpacity onPress={() => refetch()}><Text>Thử lại</Text></TouchableOpacity>}</View>}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{item.title}</Text>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.purpleDark} />
              <Text style={styles.infoText}>Địa điểm: {item.location}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="cash-outline" size={16} color={COLORS.greenCheck} />
              <Text style={[styles.infoText, { color: COLORS.greenCheck, fontWeight: '700' }]}>
                Mức lương: {item.salary_range || item.salary || 'Thỏa thuận'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.muted} />
              <Text style={styles.infoText}>{item.description || item.type || 'Xem thông tin khi ứng tuyển'}</Text>
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => handleApply(item)}>
              <Text style={styles.applyBtnText}>ỨNG TUYỂN NGAY</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <Modal visible={!!selectedJob} transparent animationType="fade" onRequestClose={() => setSelectedJob(null)}><View style={{ flex: 1, backgroundColor: '#0007', justifyContent: 'center', padding: 24 }}><ScrollView style={{ backgroundColor: COLORS.bg, maxHeight: '85%', borderRadius: 12 }} contentContainerStyle={{ padding: 22, gap: 16 }}><Text style={styles.jobTitle}>Ứng tuyển: {selectedJob?.title}</Text>{[['Họ tên', name, setName], ['Số điện thoại', phone, setPhone], ['Email', email, setEmail], ['Lời giới thiệu / liên kết CV', note, setNote]].map(([label, value, setter]: any) => <TextInput key={label} accessibilityLabel={label} placeholder={label} value={value} onChangeText={setter} style={{ padding: 14, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 6 }}/>) }{!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}<TouchableOpacity disabled={sending} style={styles.applyBtn} onPress={submit}><Text style={styles.applyBtnText}>{sending ? 'Đang gửi…' : 'Gửi hồ sơ'}</Text></TouchableOpacity><TouchableOpacity onPress={() => setSelectedJob(null)} style={{ padding: 14 }}><Text>Đóng</Text></TouchableOpacity></ScrollView></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.purpleDark,
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 14, fontWeight: '900', color: COLORS.gold },
  headerSub: { fontSize: 11, color: '#D1C4E9', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 30 },
  jobCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jobTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 10, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 12, color: COLORS.text },
  applyBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
});
