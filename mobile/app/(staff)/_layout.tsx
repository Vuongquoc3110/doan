import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import COLORS from '../../src/theme/colors';

export default function StaffLayout() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user || (user.role !== 'staff' && user.role !== 'admin')) {
      router.replace('/(auth)/login');
    }
  }, [user, isAuthenticated]);

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
      <Stack.Screen
        name="index"
        options={{
          title: `Cổng Nhân Viên • ${user?.store_name || 'Chi nhánh Yên Lãng'}`,
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          title: 'Đơn Hàng Cửa Hàng',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="pos"
        options={{
          title: 'POS Bán Hàng Tại Quầy',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="inventory"
        options={{
          title: 'Kiểm Kê & Báo Hỏng Kho',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="returns"
        options={{
          title: 'Xử Lý Đổi Trả (48H)',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="attendance"
        options={{
          title: 'Chấm Công Điểm Danh',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
