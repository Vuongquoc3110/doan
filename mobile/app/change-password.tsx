import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import apiClient from '../src/api/client';
import { useAuthStore } from '../src/store/useAuthStore';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [values, setValues] = useState(['', '', '']);
  const [focused, setFocused] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  if (isLoading) return <ActivityIndicator color="#183e32" />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  async function submit() {
    if (busy) return;
    setError('');
    if (!values[0]) return setError('Vui lòng nhập mật khẩu hiện tại.');
    if (values[1].length < 6) return setError('Mật khẩu mới tối thiểu 6 ký tự.');
    if (values[1] !== values[2]) return setError('Mật khẩu xác nhận không khớp.');
    if (values[0] === values[1]) return setError('Vui lòng chọn mật khẩu khác mật khẩu hiện tại.');
    setBusy(true);
    try {
      await apiClient.put('/v1/me/password', { oldPassword: values[0], newPassword: values[1] });
      setValues(['', '', '']);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Stack.Screen options={{ title: 'Đổi mật khẩu', headerShown: true }} />
    <View style={s.card}>
      <Text style={s.title}>Đổi mật khẩu</Text>
      {success ? <>
        <Text accessibilityLiveRegion="polite" style={s.note}>Đổi mật khẩu thành công. Hãy dùng mật khẩu mới cho lần đăng nhập tiếp theo.</Text>
        <TouchableOpacity style={s.button} onPress={() => router.back()}><Text style={s.buttonText}>Quay lại</Text></TouchableOpacity>
      </> : <>
        <Text style={s.note}>Nhập mật khẩu hiện tại để đặt mật khẩu mới cho tài khoản của bạn.</Text>
        {['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới'].map((label, i) => <View key={label} style={s.field}>
          <Text style={s.label}>{label}</Text>
          <TextInput accessibilityLabel={label} style={[s.input, focused === i && s.focused]} value={values[i]} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={i === 0 ? 'current-password' : 'new-password'} editable={!busy}
            onFocus={() => setFocused(i)} onBlur={() => setFocused(null)}
            onChangeText={text => { setValues(previous => previous.map((v, index) => index === i ? text : v)); setError(''); }}
            returnKeyType={i === 2 ? 'done' : 'next'} onSubmitEditing={i === 2 ? submit : undefined} />
        </View>)}
        {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={busy} style={[s.button, busy && { opacity: 0.6 }]} onPress={submit}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Lưu mật khẩu mới</Text>}</TouchableOpacity>
      </>}
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#f4f6f3', padding: 24, alignItems: 'center' },
  card: { width: '100%', maxWidth: 480, padding: 24, borderRadius: 14, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '600', color: '#183e32' },
  note: { color: '#647567', lineHeight: 23, marginVertical: 20 },
  field: { marginBottom: 18 }, label: { color: '#365740', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#dce4d6', borderRadius: 8, padding: 14, color: '#183e32', ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  focused: { borderColor: '#64875a' }, error: { color: '#b25341', marginBottom: 16 },
  button: { backgroundColor: '#183e32', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
