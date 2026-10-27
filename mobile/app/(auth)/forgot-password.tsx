import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isDesktop, height } = useBreakpoint();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [focused, setFocused] = useState('');
  const [visible, setVisible] = useState(false);
  async function requestOtp() {
    if (loading) return;
    setError('');
    if (!/^\+?\d{9,15}$/.test(phone.trim())) return setError('Vui lòng nhập số điện thoại hợp lệ, từ 9 đến 15 chữ số.');
    setLoading(true);
    try {
      const res = await apiClient.post('/v1/auth/forgot-password', { phone: phone.trim() });
      setDemoOtp(res.data?.data?.otp || '');
      setOtp('');
      setStep(2);
    } catch (e: any) { setError(e.message || 'Chưa thể gửi mã. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  async function resetPassword() {
    if (loading) return;
    setError('');
    if (!/^\d{6}$/.test(otp)) return setError('Mã xác thực gồm 6 chữ số.');
    if (password.length < 6) return setError('Mật khẩu mới cần ít nhất 6 ký tự.');
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp.');
    setLoading(true);
    try {
      await apiClient.post('/v1/auth/reset-password', { phone: phone.trim(), otp, newPassword: password });
      setPassword(''); setConfirm(''); setOtp(''); setDemoOtp(''); setStep(3);
    } catch (e: any) { setError(e.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }
  function field(label: string, key: string, value: string, onChange: (v: string) => void, secure = false) {
    return <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputBox, focused === key && s.inputFocused]}>
        <Ionicons name={key === 'phone' ? 'call-outline' : key === 'otp' ? 'keypad-outline' : 'lock-closed-outline'} size={19} color="#8b9887" />
        <TextInput accessibilityLabel={label} style={s.input} value={value} editable={!loading} placeholder={key === 'phone' ? 'Nhập số điện thoại đã đăng ký' : key === 'otp' ? 'Nhập 6 chữ số' : 'Tối thiểu 6 ký tự'} placeholderTextColor="#a3ad9e"
          onChangeText={v => { onChange(key === 'otp' ? v.replace(/\D/g, '').slice(0, 6) : v); setError(''); }}
          onFocus={() => setFocused(key)} onBlur={() => setFocused('')} secureTextEntry={secure && !visible} autoCapitalize="none" autoCorrect={false}
          keyboardType={key === 'phone' ? 'phone-pad' : key === 'otp' ? 'number-pad' : 'default'}
          autoComplete={key === 'phone' ? 'tel' : key === 'otp' ? 'one-time-code' : 'new-password'}
          onSubmitEditing={key === 'phone' ? requestOtp : key === 'confirm' ? resetPassword : undefined} />
        {secure && <TouchableOpacity accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible(!visible)} style={s.eye}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color="#8b9887" /></TouchableOpacity>}
      </View>
    </View>;
  }
  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.canvas, { minHeight: height }, !isDesktop && { flexDirection: 'column' }]}>
      {isDesktop && <View style={s.aside}>
        <View style={s.brand}><View style={s.brandIcon}><Ionicons name="leaf" size={25} color="#d5e5b8" /></View><View><Text style={s.brandName}>VQ FRUIT</Text><Text style={s.brandTag}>FRESHNESS, REFINED.</Text></View></View>
        <View style={s.asideCopy}><Text style={s.eyebrow}>AN TÂM TRỞ LẠI</Text><Text style={s.asideTitle}>Một bước nhỏ,{'\n'}kết nối trở lại.</Text><Text style={s.asideNote}>Khôi phục tài khoản để tiếp tục chọn những thức quả ngon và gửi trao những món quà đầy ý nghĩa.</Text>
          <View style={s.divider} />
          {['Nhập số điện thoại đã đăng ký', 'Xác thực và tạo mật khẩu mới', 'Trở lại trải nghiệm VQ FRUIT'].map((text, i) => <View key={text} style={s.guide}><View style={[s.guideNumber, step === i + 1 && s.guideActive]}><Text style={s.guideNumberText}>{i + 1}</Text></View><Text style={[s.guideText, step === i + 1 && { color: '#f1f5e9' }]}>{text}</Text></View>)}
        </View>
        <Text style={s.asideFooter}>VQ FRUIT / A LITTLE FRESHNESS, EVERY DAY</Text>
      </View>}
      <View style={[s.main, !isDesktop && { padding: 24 }]}><View style={s.form}>
        <TouchableOpacity style={s.back} onPress={() => router.replace('/(auth)/login')}><Ionicons name="arrow-back" size={17} color="#70846d" /><Text style={s.backText}>Trở về đăng nhập</Text></TouchableOpacity>
        <View style={s.icon}><Ionicons name={step === 3 ? 'checkmark-circle-outline' : 'lock-open-outline'} size={29} color="#365d3b" /></View>
        <Text style={s.step}>KHÔI PHỤC TÀI KHOẢN · {step === 3 ? 'HOÀN TẤT' : 'BƯỚC ' + step + '/2'}</Text>
        <Text style={s.title}>{step === 1 ? 'Quên mật khẩu?' : step === 2 ? 'Tạo khởi đầu mới.' : 'Sẵn sàng trở lại.'}</Text>
        <Text style={s.description}>{step === 1 ? 'Đừng lo, chỉ vài bước để lấy lại quyền truy cập tài khoản của bạn.' : step === 2 ? 'Nhập mã xác thực cho số ' + phone.trim() + ' và đặt mật khẩu mới.' : 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.'}</Text>
        {!!error && <View style={s.error}><Ionicons name="alert-circle-outline" size={18} color="#b25341" /><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.errorText}>{error}</Text></View>}
        {step === 1 && field('Số điện thoại', 'phone', phone, setPhone)}
        {step === 2 && <>
          {!!demoOtp && <View style={s.demo}><Text style={s.demoText}>Chế độ thử nghiệm · Mã xác thực: {demoOtp}</Text></View>}
          {field('Mã xác thực OTP', 'otp', otp, setOtp)}
          {field('Mật khẩu mới', 'password', password, setPassword, true)}
          {field('Xác nhận mật khẩu mới', 'confirm', confirm, setConfirm, true)}
        </>}
        <TouchableOpacity accessibilityRole="button" disabled={loading} style={[s.submit, loading && { opacity: 0.6 }]} onPress={step === 1 ? requestOtp : step === 2 ? resetPassword : () => router.replace('/(auth)/login')}>
          {loading ? <ActivityIndicator color="#fff" /> : <><Text style={s.submitText}>{step === 1 ? 'Nhận mã xác thực' : step === 2 ? 'Lưu mật khẩu mới' : 'Đăng nhập ngay'}</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>}
        </TouchableOpacity>
        {step === 2 && <View style={s.secondaryRow}><TouchableOpacity disabled={loading} onPress={requestOtp}><Text style={s.secondary}>Gửi lại mã OTP</Text></TouchableOpacity><TouchableOpacity disabled={loading} onPress={() => { setStep(1); setOtp(''); setDemoOtp(''); setError(''); }}><Text style={s.secondary}>Đổi số điện thoại</Text></TouchableOpacity></View>}
        <View style={s.help}><Ionicons name="shield-checkmark-outline" size={18} color="#82937c" /><Text style={s.helpText}>Giữ mã xác thực cho riêng bạn để bảo vệ tài khoản.</Text></View>
        <View style={s.footer}><Text style={s.footerText}>© {new Date().getFullYear()} VQ FRUIT</Text><TouchableOpacity onPress={() => router.push('/(customer)/feedback')}><Text style={s.footerText}>Cần hỗ trợ? ↗</Text></TouchableOpacity></View>
      </View></View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fdfefb' }, canvas: { flexGrow: 1, flexDirection: 'row' },
  aside: { width: '43%', backgroundColor: '#14392e', padding: 48, justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brandIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffffff12', alignItems: 'center', justifyContent: 'center' }, brandName: { color: '#fff', fontSize: 23, fontWeight: '600', letterSpacing: 2 }, brandTag: { color: '#a2bba9', fontSize: 8, letterSpacing: 2, marginTop: 5 },
  asideCopy: { paddingVertical: 64 }, eyebrow: { fontSize: 10, letterSpacing: 2, color: '#b5c99b', marginBottom: 24 }, asideTitle: { fontFamily: Platform.select({ web: 'Arial, sans-serif', ios: 'System', default: 'sans-serif' }), fontWeight: '500', fontSize: 44, lineHeight: 58, color: '#f5f7e8' }, asideNote: { maxWidth: 350, color: '#b4c7b7', lineHeight: 25, fontSize: 14, marginTop: 24 }, divider: { width: 45, height: 1, backgroundColor: '#6a8b69', marginVertical: 32 },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }, guideNumber: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: '#547261', alignItems: 'center', justifyContent: 'center' }, guideActive: { backgroundColor: '#365b43', borderColor: '#b5c99b' }, guideNumberText: { fontSize: 12, color: '#d5e5b8' }, guideText: { color: '#9bb5a4', fontSize: 12, flex: 1 }, asideFooter: { fontSize: 8, letterSpacing: 1.8, color: '#90a997' },
  main: { flex: 1, padding: 48, alignItems: 'center', justifyContent: 'center' }, form: { width: '100%', maxWidth: 430 }, back: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, marginBottom: 32 }, backText: { fontSize: 12, color: '#70846d' }, icon: { width: 57, height: 57, borderRadius: 18, backgroundColor: '#edf2e7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, step: { fontSize: 9, color: '#809273', letterSpacing: 1.7, marginBottom: 12 }, title: { fontSize: 32, fontWeight: '600', color: '#203c30', letterSpacing: -0.8 }, description: { color: '#8a9882', fontSize: 13, lineHeight: 23, marginTop: 13, marginBottom: 30 },
  field: { marginBottom: 20 }, label: { color: '#4e654b', fontSize: 12, fontWeight: '500', marginBottom: 10 }, inputBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e0e6d9', borderRadius: 8, paddingLeft: 15, minHeight: 53, backgroundColor: '#fbfcf8' }, inputFocused: { borderColor: '#64875a', backgroundColor: '#fff' }, input: { flex: 1, minWidth: 0, paddingVertical: 16, paddingRight: 12, color: '#203c30', fontSize: 13, ...Platform.select({ web: { outlineStyle: 'none' } as any }) }, eye: { padding: 14 },
  submit: { minHeight: 53, backgroundColor: '#183e32', borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 18, marginTop: 3 }, submitText: { color: '#fff', fontSize: 13, fontWeight: '600' }, secondaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, secondary: { color: '#56764d', fontSize: 12, paddingVertical: 13 },
  help: { flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 27 }, helpText: { flex: 1, color: '#94a08a', fontSize: 11, lineHeight: 19 }, footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#edf0e8', marginTop: 44, paddingTop: 20 }, footerText: { color: '#94a08a', fontSize: 10 }, error: { flexDirection: 'row', gap: 9, padding: 13, backgroundColor: '#fff1ee', borderRadius: 8, marginBottom: 20 }, errorText: { flex: 1, color: '#b25341', fontSize: 12, lineHeight: 20 }, demo: { padding: 12, borderRadius: 8, backgroundColor: '#f5f1df', marginBottom: 18 }, demoText: { color: '#847037', fontSize: 12, lineHeight: 20 },
});
