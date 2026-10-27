import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import COLORS from '../../src/theme/colors';

export default function CustomerLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuthStore();
  const protectedPage = segments.some(segment => ['checkout', 'orders', 'order', 'wishlist'].includes(segment));
  useEffect(() => {
    if (protectedPage && !isLoading && !isAuthenticated) router.replace('/(auth)/login');
  }, [protectedPage, isLoading, isAuthenticated]);
  if (protectedPage && (isLoading || !isAuthenticated)) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={COLORS.primary} /></View>;
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: 'Chi Tiết Sản Phẩm', headerShown: false }} />
      <Stack.Screen name="checkout" options={{ title: 'Thanh Toán Đơn Hàng', headerShown: true }} />
      <Stack.Screen name="orders" options={{ title: 'Đơn Hàng Của Tôi', headerShown: true }} />
      <Stack.Screen name="order/[id]" options={{ title: 'Chi Tiết Đơn Hàng', headerShown: true }} />
      <Stack.Screen name="order/return/[id]" options={{ title: 'Yêu Cầu Đổi Trả (48H)', headerShown: true }} />
      <Stack.Screen name="stores" options={{ title: 'Hệ Thống Cửa Hàng', headerShown: true }} />
      <Stack.Screen name="articles/index" options={{ title: 'Cẩm Nang Trái Cây & Dinh Dưỡng', headerShown: true }} />
      <Stack.Screen name="articles/[id]" options={{ title: 'Bài Viết', headerShown: true }} />
      <Stack.Screen name="wishlist" options={{ title: 'Sản Phẩm Yêu Thích', headerShown: true }} />
      <Stack.Screen name="vouchers" options={{ title: 'Mã Giảm Giá & Quà Tặng', headerShown: true }} />
      <Stack.Screen name="policy" options={{ title: 'Chính Sách Đổi Trả Trong 48H', headerShown: true }} />
      <Stack.Screen name="feedback" options={{ title: 'Góp Ý Chất Lượng', headerShown: true }} />
      <Stack.Screen name="recruitment" options={{ title: 'Tuyển Dụng Nhân Sự', headerShown: true }} />
    </Stack>
  );
}
