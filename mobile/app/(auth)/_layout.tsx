import React from 'react';
import { Stack } from 'expo-router';
import COLORS from '../../src/theme/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.purpleDark },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Quay lại',
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Đăng nhập VQ FRUIT', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Đăng ký tài khoản', headerShown: true }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Khôi phục mật khẩu', headerShown: true }} />
    </Stack>
  );
}
