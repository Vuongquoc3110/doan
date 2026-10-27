import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

const TOPICS = ['Dịch vụ tại cửa hàng', 'Chất lượng trái cây', 'Giao nhận đơn hàng', 'Quà tặng & đóng gói', 'Trải nghiệm ứng dụng'];
const RATINGS = ['Chưa hài lòng', 'Cần cải thiện', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];
export default function FeedbackScreen() {
  const router = useRouter();
  const { isDesktop, isMobile } = useBreakpoint();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [focused, setFocused] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit() {
    if (busy) return;
    setError('');
    if (!name.trim() || !phone.trim() || !content.trim()) return setError('Vui lòng điền họ tên, số điện thoại và nội dung góp ý.');
    if (!/^\+?\d{9,15}$/.test(phone.trim().replace(/\s/g, ''))) return setError('Vui lòng kiểm tra lại số điện thoại của bạn.');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Địa chỉ email chưa hợp lệ.');
    setBusy(true);
    try {
      await apiClient.post('/v1/feedback', { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, content: `[${topic}] ${rating}/5 sao\n${content.trim()}` });
      setSent(true); setContent('');
    } catch (e: any) { setError(e.message || 'Chưa gửi được góp ý. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  function field(label: string, key: string, value: string, change: (value: string) => void, placeholder: string) {
    return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} editable={!busy} value={value} onChangeText={v => { change(v); setError(''); }} placeholder={placeholder} placeholderTextColor="#a0aa95" style={[s.input, focused === key && s.focused]} onFocus={() => setFocused(key)} onBlur={() => setFocused('')} keyboardType={key === 'phone' ? 'phone-pad' : key === 'email' ? 'email-address' : 'default'} autoCapitalize={key === 'email' ? 'none' : 'sentences'} autoCorrect={key !== 'email'} /></View>;
  }
  return <View style={s.page}><Stack.Screen options={{ headerShown: false }} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.canvas, isMobile && { padding: 20 }]}>
    <View style={s.header}><TouchableOpacity accessibilityRole="button" style={s.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/(customer)/(tabs)')}><Ionicons name="arrow-back" size={19} color="#183e32" /><Text style={s.backText}>Trở về cửa hàng</Text></TouchableOpacity><Text style={s.brand}>VQ FRUIT</Text></View>
    <View style={[s.layout, !isDesktop && s.vertical]}>
      <View style={[s.aside, !isDesktop && { width: '100%' }, isMobile && { padding: 27 }]}>
        <View style={s.asideIcon}><Ionicons name="chatbubbles-outline" size={30} color="#d7e4b8" /></View><Text style={s.eyebrow}>MỖI Ý KIẾN ĐỀU ĐƯỢC TRÂN TRỌNG</Text><Text style={[s.title, isMobile && { fontSize: 31, lineHeight: 41 }]}>Lắng nghe bạn.{ '\n' }Để tốt hơn mỗi ngày.</Text><Text style={s.asideText}>Một lời khen, một điều chưa hài lòng hay một ý tưởng nhỏ — chia sẻ của bạn giúp VQ FRUIT chăm chút trải nghiệm tốt hơn.</Text>
        <View style={s.asideDivider} />
        {[['leaf-outline', 'Chọn vị ngon', 'Chất lượng trong từng thức quả.'], ['heart-outline', 'Trao sự tận tâm', 'Chỉn chu ở từng lần phục vụ.']].map(([icon, title, text]) => <View key={title} style={s.promise}><Ionicons name={icon as any} size={22} color="#c3d5a7" /><View style={{ flex: 1 }}><Text style={s.promiseTitle}>{title}</Text><Text style={s.promiseText}>{text}</Text></View></View>)}
        <Text style={s.asideFooter}>VQ FRUIT / FRESHNESS, REFINED.</Text>
      </View>
      <View style={[s.form, !isDesktop && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }, isMobile && { padding: 23 }]}>
        {sent ? <View style={s.success}><View style={s.successIcon}><Ionicons name="checkmark" size={34} color="#365d3b" /></View><Text style={s.formTitle}>Cảm ơn bạn đã chia sẻ.</Text><Text style={s.formNote}>Góp ý của bạn đã được gửi đến VQ FRUIT. Chúng mình trân trọng thời gian và sự quan tâm của bạn.</Text><TouchableOpacity accessibilityRole="button" style={s.submit} onPress={() => router.replace('/(customer)/(tabs)')}><Text style={s.submitText}>Tiếp tục khám phá cửa hàng</Text><Ionicons name="arrow-forward" size={19} color="#fff" /></TouchableOpacity><TouchableOpacity style={s.secondary} onPress={() => setSent(false)}><Text style={s.secondaryText}>Gửi một góp ý khác</Text></TouchableOpacity></View> : <>
          <Text style={s.formTitle}>Chia sẻ trải nghiệm của bạn</Text><Text style={s.formNote}>Điền thông tin bên dưới để chúng mình hiểu và hỗ trợ bạn tốt hơn. Dấu * là thông tin bắt buộc.</Text>
          <Text style={s.sectionLabel}>01 / THÔNG TIN LIÊN HỆ</Text>
          <View style={[s.fieldRow, isMobile && s.vertical]}><View style={isMobile ? { width: '100%' } : { flex: 1 }}>{field('Họ và tên *', 'name', name, setName, 'Bạn tên là gì?')}</View><View style={{ flex: 1 }}>{field('Số điện thoại *', 'phone', phone, setPhone, 'Số điện thoại liên hệ')}</View></View>
          {field('Email (không bắt buộc)', 'email', email, setEmail, 'ban@example.com')}
          <Text style={s.sectionLabel}>02 / TRẢI NGHIỆM CỦA BẠN</Text><Text style={s.label}>Bạn muốn chia sẻ về điều gì?</Text><View style={s.topics}>{TOPICS.map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: topic === value }} disabled={busy} onPress={() => setTopic(value)} style={[s.topic, topic === value && s.topicActive]}><Text style={[s.topicText, topic === value && { color: '#183e32' }]}>{value}</Text>{topic === value && <Ionicons name="checkmark" size={15} color="#365d3b" />}</TouchableOpacity>)}</View>
          <View style={s.ratingBox}><Text style={s.label}>Mức độ hài lòng</Text><View style={s.stars}>{[1, 2, 3, 4, 5].map(value => <TouchableOpacity key={value} accessibilityRole="radio" accessibilityLabel={`${value} sao`} accessibilityState={{ checked: rating === value }} disabled={busy} onPress={() => setRating(value)} style={s.star}><Ionicons name={value <= rating ? 'star' : 'star-outline'} size={29} color={value <= rating ? '#b2944f' : '#c6cbbd'} /></TouchableOpacity>)}<Text style={s.ratingLabel}>{RATINGS[rating - 1]}</Text></View></View>
          <Text style={s.sectionLabel}>03 / LỜI NHẮN GỬI</Text><Text style={s.label}>Nội dung góp ý *</Text><TextInput accessibilityLabel="Nội dung góp ý" multiline textAlignVertical="top" editable={!busy} value={content} maxLength={2000} onChangeText={v => { setContent(v); setError(''); }} placeholder="Điều gì khiến bạn hài lòng, hoặc điều gì chúng mình có thể làm tốt hơn?" placeholderTextColor="#a0aa95" style={[s.input, s.textarea, focused === 'content' && s.focused]} onFocus={() => setFocused('content')} onBlur={() => setFocused('')} /><Text style={s.counter}>{content.length} / 2.000 ký tự</Text>
          {!!error && <View style={s.error}><Ionicons name="alert-circle-outline" size={19} color="#a24b38" /><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.errorText}>{error}</Text></View>}
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={submit} style={[s.submit, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color="#fff" /> : <><Text style={s.submitText}>Gửi góp ý của bạn</Text><Ionicons name="arrow-forward" size={19} color="#fff" /></>}</TouchableOpacity><View style={s.privacy}><Ionicons name="shield-checkmark-outline" size={16} color="#8b987d" /><Text style={s.privacyText}>Thông tin liên hệ giúp VQ FRUIT phản hồi về góp ý của bạn.</Text></View>
        </>}
      </View>
    </View>
    <Text style={s.footer}>© {new Date().getFullYear()} VQ FRUIT · Chăm chút từ những điều nhỏ nhất.</Text>
  </ScrollView></View>;
}
const s = StyleSheet.create({
  page: { flex: 1, minHeight: 0, backgroundColor: '#f7f6f0' }, canvas: { width: '100%', maxWidth: 1260, alignSelf: 'center', padding: 32 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26, gap: 15 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }, backText: { color: '#607357', fontSize: 13 }, brand: { color: '#183e32', fontSize: 18, letterSpacing: 1.8, fontWeight: '600' }, layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 }, vertical: { flexDirection: 'column' }, aside: { width: '36%', padding: 34, backgroundColor: '#183e32', borderRadius: 20 }, asideIcon: { width: 61, height: 61, borderRadius: 18, backgroundColor: '#ffffff10', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }, eyebrow: { fontSize: 9, letterSpacing: 1.5, lineHeight: 17, color: '#c4d4ad', marginBottom: 17 }, title: { fontSize: 34, lineHeight: 46, letterSpacing: -0.7, color: '#f7faec', fontWeight: '500' }, asideText: { color: '#b5c9af', fontSize: 13, lineHeight: 25, marginTop: 22 }, asideDivider: { width: 43, height: 1, backgroundColor: '#66835d', marginVertical: 30 }, promise: { flexDirection: 'row', gap: 13, marginBottom: 23 }, promiseTitle: { color: '#e4edcf', fontSize: 13 }, promiseText: { color: '#9fb495', fontSize: 11, lineHeight: 20, marginTop: 5 }, asideFooter: { marginTop: 27, color: '#88a07d', fontSize: 8, letterSpacing: 1.4 },
  form: { flex: 1, width: '100%', padding: 34, borderRadius: 20, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e3e7da' }, formTitle: { color: '#183e32', fontSize: 24, lineHeight: 33, fontWeight: '600' }, formNote: { color: '#7e8b73', fontSize: 13, lineHeight: 23, marginTop: 10, marginBottom: 26 }, sectionLabel: { fontSize: 9, color: '#8a977b', letterSpacing: 1.6, marginTop: 10, marginBottom: 18 }, fieldRow: { flexDirection: 'row', gap: 16 }, field: { marginBottom: 19 }, label: { color: '#4e6545', fontSize: 12, marginBottom: 9, fontWeight: '500' }, input: { borderWidth: 1, borderColor: '#dfe5d5', backgroundColor: '#fbfcf7', borderRadius: 9, padding: 14, fontSize: 14, color: '#183e32', minHeight: 49, ...Platform.select({ web: { outlineStyle: 'none' } as any }) }, focused: { borderColor: '#739064', backgroundColor: '#fff' }, topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 21 }, topic: { paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#e1e6d7', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7 }, topicActive: { backgroundColor: '#edf2e3', borderColor: '#a4b693' }, topicText: { color: '#859077', fontSize: 11 }, ratingBox: { backgroundColor: '#f6f5eb', padding: 17, borderRadius: 10, marginBottom: 25 }, stars: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 3 }, star: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, ratingLabel: { color: '#94814c', fontSize: 11, marginLeft: 10 }, textarea: { minHeight: 130, lineHeight: 23 }, counter: { color: '#9aa58e', textAlign: 'right', fontSize: 10, marginVertical: 9 }, submit: { backgroundColor: '#183e32', borderRadius: 9, minHeight: 52, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 10 }, submitText: { color: '#fff', fontSize: 14, fontWeight: '600' }, privacy: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' }, privacyText: { flex: 1, color: '#99a28c', fontSize: 10, lineHeight: 18 }, error: { flexDirection: 'row', gap: 8, borderRadius: 8, padding: 12, backgroundColor: '#fff0eb', marginVertical: 10 }, errorText: { flex: 1, color: '#a24b38', fontSize: 12, lineHeight: 20 }, success: { paddingVertical: 34 }, successIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#e9f0df', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, secondary: { padding: 16, alignItems: 'center' }, secondaryText: { color: '#68845a', fontSize: 12 }, footer: { textAlign: 'center', color: '#919e84', fontSize: 10, marginTop: 30, lineHeight: 20 },
});
