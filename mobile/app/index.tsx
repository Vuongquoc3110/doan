import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import COLORS from '../src/theme/colors';

export default function Index() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (user.role === 'admin') {
          router.replace('/(admin)');
        } else if (user.role === 'staff') {
          router.replace('/(staff)');
        } else {
          router.replace('/(customer)/(tabs)');
        }
      } else {
        // Guest can browse shop immediately
        router.replace('/(customer)/(tabs)');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Text style={styles.logoEmoji}>🍇</Text>
      </View>
      <Text style={styles.brandTitle}>VQ FRUIT</Text>
      <Text style={styles.tagline}>Trái Cây Tươi & Giỏ Quà Tặng Cao Cấp</Text>
      <Text style={styles.since}>Tươi ngon mỗi ngày · Tinh tế trong từng lựa chọn</Text>
      <ActivityIndicator size="large" color={COLORS.gold} style={styles.spinner} />
      <Text style={styles.statusText}>Đang kết nối hệ thống...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purpleDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  logoEmoji: {
    fontSize: 48,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 6,
  },
  since: {
    fontSize: 12,
    color: '#D1C4E9',
    textAlign: 'center',
    marginBottom: 36,
  },
  spinner: {
    marginBottom: 14,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
