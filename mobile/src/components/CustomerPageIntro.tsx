import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CustomerPageIntro({ title, subtitle }: { title: string; subtitle: string }) {
  const router = useRouter();
  return <View style={{ paddingVertical: 26, gap: 12 }}>
    <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/(customer)/(tabs)')} style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 }}>
      <Ionicons name="leaf-outline" size={22} color="#183e32"/><Text style={{ color: '#183e32', fontWeight: '700', letterSpacing: 2 }}>VQ FRUIT</Text><Text style={{ color: '#687367', marginLeft: 12 }}> / {title}</Text>
    </TouchableOpacity>
    <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '600', color: '#183e32', letterSpacing: -.7 }}>{title}</Text>
    <Text style={{ color: '#687367', fontSize: 14, lineHeight: 22 }}>{subtitle}</Text>
  </View>;
}
