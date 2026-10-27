import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform, Image, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useBreakpoint } from '../../src/hooks/useBreakpoint';

export default function LoginScreen() {
  const router = useRouter();
  const { isDesktop, height } = useBreakpoint();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (loading) return;
    const p = phone.trim();
    const pw = password;

    if (!p) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }
    if (!pw) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const { role } = await login(p, pw);

      if (role === 'admin') {
        router.replace('/(admin)');
      } else if (role === 'staff') {
        router.replace('/(staff)');
      } else {
        router.replace('/(customer)/(tabs)');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại số điện thoại hoặc mật khẩu.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.canvas, { minHeight: height }, !isDesktop && s.canvasMobile]}>
      {isDesktop && <View style={s.visualPanel}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1400&q=85' }} style={StyleSheet.absoluteFill} resizeMode="cover"/>
        <View style={s.visualTint}/>
        <TouchableOpacity accessibilityLabel="Về trang chủ VQ FRUIT" onPress={() => router.replace('/(customer)/(tabs)')} style={s.brand}><View style={s.brandIcon}><Ionicons name="leaf" size={23} color="#d5e5b8"/></View><View><Text style={s.brandName}>VQ FRUIT</Text><Text style={s.brandTag}>FRESHNESS, REFINED.</Text></View></TouchableOpacity>
        <View style={s.visualCopy}><Text style={s.eyebrow}>TỪ THIÊN NHIÊN · ĐẾN BẠN</Text><Text style={s.visualTitle}>Mỗi ngày,{ '\n' }một chút tươi lành.</Text><Text style={s.visualDescription}>Những thức quả được chọn bằng sự quan tâm.{ '\n' }Những món quà gửi trao bằng cả tấm lòng.</Text><View style={s.visualLine}/><View style={s.visualBenefits}><Ionicons name="leaf-outline" size={18} color="#c5d7b3"/><Text style={s.visualNote}>Tươi ngon mỗi ngày. Tinh tế trong từng lựa chọn.</Text></View></View>
        <Text style={s.visualFooter}>VQ FRUIT / A LITTLE FRESHNESS, EVERY DAY</Text>
      </View>}
      <View style={[s.formPanel, !isDesktop && s.formPanelMobile]}>
        <View style={[s.formContainer, !isDesktop && m.formContainer]}>
          <TouchableOpacity accessibilityRole="button" style={[s.backLink, !isDesktop && m.backLink]} onPress={() => router.replace('/(customer)/(tabs)')}><Ionicons name="arrow-back" size={16} color="#839181"/><Text style={[s.backText, !isDesktop && m.backText]}>Trở về cửa hàng</Text></TouchableOpacity>
          {!isDesktop && <View style={[s.brand, { marginBottom: 24 }]}><View style={[s.brandIcon, { backgroundColor: '#e9efe2' }]}><Ionicons name="leaf" size={23} color="#183e32"/></View><Text style={[s.brandName, { color: '#183e32' }]}>VQ FRUIT</Text></View>}
          <View style={[s.welcomeIcon, !isDesktop && m.welcomeIcon]}><Ionicons name="log-in-outline" size={26} color="#315740"/></View>
          <Text style={[s.formTitle, !isDesktop && m.formTitle]}>Chào mừng trở lại.</Text><Text style={[s.formDescription, !isDesktop && m.formDescription]}>Đăng nhập để tiếp tục trải nghiệm cùng VQ FRUIT.</Text>
          {!!errorMessage && <View style={s.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite"><Ionicons name="alert-circle-outline" size={19} color="#b25341"/><Text style={s.errorText}>{errorMessage}</Text></View>}
          <View style={s.field}><Text style={[s.label, !isDesktop && m.label]}>Số điện thoại hoặc email</Text><View style={[s.inputBox, focusedField === 'phone' && s.inputFocused]}><Ionicons name="person-outline" size={18} color="#8b9887"/><TextInput accessibilityLabel="Số điện thoại hoặc email" style={[s.input, !isDesktop && m.input]} placeholder="Nhập số điện thoại" placeholderTextColor="#a8afa1" value={phone} onChangeText={value => { setPhone(value); setErrorMessage(null); }} onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} keyboardType="default" autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!loading}/></View></View>
          <View style={s.field}><View style={s.labelRow}><Text style={[s.label, !isDesktop && m.label]}>Mật khẩu</Text><TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}><Text style={[s.forgotText, !isDesktop && m.forgotText]}>Quên mật khẩu?</Text></TouchableOpacity></View><View style={[s.inputBox, focusedField === 'password' && s.inputFocused]}><Ionicons name="lock-closed-outline" size={18} color="#8b9887"/><TextInput accessibilityLabel="Mật khẩu" style={[s.input, !isDesktop && m.input]} placeholder="Nhập mật khẩu của bạn" placeholderTextColor="#a8afa1" value={password} onChangeText={value => { setPassword(value); setErrorMessage(null); }} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" returnKeyType="go" onSubmitEditing={() => handleLogin()} editable={!loading}/><TouchableOpacity accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword(!showPassword)} style={s.eye}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#8b9887"/></TouchableOpacity></View></View>
          <TouchableOpacity accessibilityRole="button" disabled={loading} style={[s.submit, !isDesktop && m.submit, loading && { opacity: 0.6 }]} onPress={() => handleLogin()}>{loading ? <ActivityIndicator color="#fff"/> : <><Text style={[s.submitText, !isDesktop && m.submitText]}>Đăng nhập</Text><Ionicons name="arrow-forward" size={18} color="#fff"/></>}</TouchableOpacity>
          <View style={s.registerRow}><Text style={[s.registerNote, !isDesktop && m.registerNote]}>Bạn chưa có tài khoản?</Text><TouchableOpacity onPress={() => router.push('/(auth)/register')}><Text style={[s.registerLink, !isDesktop && m.registerLink]}>Đăng ký ngay</Text></TouchableOpacity></View>
          <View style={s.separator}><View style={s.rule}/><Text style={s.orText}>HOẶC</Text><View style={s.rule}/></View>
          <TouchableOpacity accessibilityRole="button" style={[s.guest, !isDesktop && m.guest]} onPress={() => router.replace('/(customer)/(tabs)')}><Ionicons name="storefront-outline" size={18} color="#5a7159"/><Text style={[s.guestText, !isDesktop && m.guestText]}>Khám phá cửa hàng</Text></TouchableOpacity>
          <Text style={[s.accountNote, !isDesktop && m.accountNote]}>Tài khoản của bạn được đưa đến đúng không gian mua sắm hoặc quản lý sau khi đăng nhập.</Text>
          <View style={[s.footer, !isDesktop && m.footer]}><Text style={[s.footerText, !isDesktop && m.footerText]}>© {new Date().getFullYear()} VQ FRUIT</Text><TouchableOpacity onPress={() => router.push('/(customer)/feedback')}><Text style={[s.footerLink, !isDesktop && m.footerLink]}>Cần hỗ trợ? ↗</Text></TouchableOpacity></View>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const serif = Platform.select({ web: '"Times New Roman", serif', ios: 'Times New Roman', default: 'serif' });
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fdfefb', ...Platform.select({ web: { colorScheme: 'light' } as any }) }, canvas: { flexGrow: 1, flexDirection: 'row' }, canvasMobile: { flexDirection: 'column' }, visualPanel: { width: '45%', backgroundColor: '#14392e', padding: 45, overflow: 'hidden', justifyContent: 'space-between' }, visualTint: { ...StyleSheet.absoluteFill, backgroundColor: '#0e3029c9' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 12 }, brandIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#ffffff12', alignItems: 'center', justifyContent: 'center' }, brandName: { color: '#fff', fontSize: 23, fontWeight: '600', letterSpacing: 2 }, brandTag: { fontSize: 7, color: '#a2bba9', letterSpacing: 2, marginTop: 5 }, visualCopy: { paddingVertical: 75 }, eyebrow: { color: '#b5c99b', fontSize: 9, letterSpacing: 2, marginBottom: 25 }, visualTitle: { fontFamily: serif, fontSize: 51, lineHeight: 62, color: '#f5f7e8', letterSpacing: -0.8 }, visualDescription: { color: '#b4c7b7', fontSize: 12, lineHeight: 24, marginTop: 25 }, visualLine: { width: 44, height: 1, backgroundColor: '#8ca77b', marginTop: 40, marginBottom: 20 }, visualBenefits: { flexDirection: 'row', gap: 10, alignItems: 'center' }, visualNote: { color: '#b4c7b7', fontSize: 10, lineHeight: 20, flexShrink: 1 }, visualFooter: { color: '#90a997', fontSize: 8, letterSpacing: 1.7 },
  formPanel: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 }, formPanelMobile: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, justifyContent: 'flex-start', backgroundColor: '#fdfefb' }, formContainer: { width: '100%', maxWidth: 410 }, backLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40, minHeight: 30 }, backText: { fontSize: 11, color: '#8b9887' }, welcomeIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#edf2e7', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }, formTitle: { fontSize: 30, letterSpacing: -0.8, color: '#203c30', fontWeight: '600' }, formDescription: { color: '#909c87', fontSize: 12, lineHeight: 22, marginTop: 11, marginBottom: 30 }, field: { marginBottom: 22 }, label: { color: '#4e654b', fontSize: 12, fontWeight: '500', marginBottom: 10 }, labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }, forgotText: { color: '#6b8560', fontSize: 11 }, inputBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e0e6d9', borderRadius: 8, paddingLeft: 15, minHeight: 52, backgroundColor: '#fbfcf8' }, inputFocused: { borderColor: '#64875a', backgroundColor: '#fff' }, input: { ...Platform.select({ web: { outlineStyle: 'none' } as any }), flex: 1, minWidth: 0, paddingVertical: 15, fontSize: 13, color: '#203c30' }, eye: { padding: 14 }, submit: { backgroundColor: '#183e32', borderRadius: 8, minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 3 }, submitText: { color: '#fff', fontSize: 13, fontWeight: '600' }, registerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 23 }, registerNote: { color: '#909c87', fontSize: 12 }, registerLink: { fontSize: 12, fontWeight: '600', color: '#365d3b' }, separator: { flexDirection: 'row', gap: 15, alignItems: 'center', marginVertical: 26 }, rule: { flex: 1, height: 1, backgroundColor: '#e9ede3' }, orText: { fontSize: 8, letterSpacing: 1.7, color: '#a3ae99' }, guest: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 15, borderWidth: 1, borderColor: '#e0e6d9', borderRadius: 8 }, guestText: { color: '#5a7159', fontSize: 12 }, accountNote: { fontSize: 10, lineHeight: 19, color: '#a0aa95', textAlign: 'center', marginTop: 20 }, footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTopWidth: 1, borderColor: '#edf0e8' }, footerText: { color: '#a0aa95', fontSize: 9 }, footerLink: { color: '#7d9070', fontSize: 10 }, errorBox: { flexDirection: 'row', gap: 10, padding: 13, backgroundColor: '#fff1ee', borderRadius: 8, marginBottom: 23, alignItems: 'center' }, errorText: { flex: 1, color: '#b25341', fontSize: 12, lineHeight: 20 },
});

// Mobile controls use readable text and keep the form near the top on tall screens.
const m = StyleSheet.create({
  formContainer: { maxWidth: 560 },
  backLink: { minHeight: 44, marginBottom: 20 },
  backText: { fontSize: 14, color: '#64775e' },
  welcomeIcon: { display: 'none' },
  formTitle: { fontSize: 32, lineHeight: 42, fontWeight: '700' },
  formDescription: { fontSize: 15, lineHeight: 24, marginBottom: 26, color: '#67765e' },
  label: { fontSize: 14 },
  forgotText: { fontSize: 14, paddingVertical: 10 },
  input: { fontSize: 17, paddingVertical: 19 },
  submit: { minHeight: 58, borderRadius: 12 },
  guest: { minHeight: 54, borderRadius: 12 },
  footer: { marginTop: 28 },
  submitText: { fontSize: 16 },
  registerNote: { fontSize: 14, color: '#67765e' },
  registerLink: { fontSize: 14 },
  guestText: { fontSize: 15 },
  accountNote: { fontSize: 12, lineHeight: 20, color: '#74816a' },
  footerText: { fontSize: 11, color: '#74816a' },
  footerLink: { fontSize: 12 },
});
