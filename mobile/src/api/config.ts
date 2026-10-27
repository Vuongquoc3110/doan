import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_CUSTOM_API_KEY = '@klever_custom_api_url';
export const DEFAULT_PORT = 4000;

/**
 * Tự động phát hiện IP của máy tính chạy server phát triển
 * Phù hợp với Expo Go chạy trên điện thoại thật
 */
export function getAutoDiscoveredServerHost(): string {
  // Phone previews use a separate API tunnel; the Metro tunnel is not an API host.
  if (Platform.OS !== 'web' && process.env.EXPO_PUBLIC_PHONE_API_URL) {
    return process.env.EXPO_PUBLIC_PHONE_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  // 1. Kiểm tra biến môi trường EXPO_PUBLIC_API_URL
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, '');
  }

  // 2. Lấy hostUri từ Expo Constants (Expo Go cung cấp IP máy tính đang chạy metro bundler)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:${DEFAULT_PORT}`;
    }
  }

  // 3. Fallback cho Android Emulator
  if (Platform.OS === 'android') {
    // 10.0.2.2 là localhost của máy tính trên Android Emulator
    return `http://10.0.2.2:${DEFAULT_PORT}`;
  }

  // 4. Fallback cho Web / iOS Simulator
  return `http://localhost:${DEFAULT_PORT}`;
}

let cachedBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  // An explicitly configured phone preview must not use a stale saved LAN URL.
  if (Platform.OS !== 'web' && process.env.EXPO_PUBLIC_PHONE_API_URL) {
    return `${getAutoDiscoveredServerHost()}/api`;
  }
  try {
    const customUrl = await AsyncStorage.getItem(STORAGE_CUSTOM_API_KEY);
    if (customUrl && customUrl.trim()) {
      cachedBaseUrl = customUrl.trim().replace(/\/$/, '');
      return cachedBaseUrl.endsWith('/api') ? cachedBaseUrl : `${cachedBaseUrl}/api`;
    }
  } catch {
    // fallback if storage read fails
  }

  const base = getAutoDiscoveredServerHost();
  cachedBaseUrl = `${base}/api`;
  return cachedBaseUrl;
}

export async function setCustomApiUrl(url: string | null): Promise<void> {
  if (url && url.trim()) {
    await AsyncStorage.setItem(STORAGE_CUSTOM_API_KEY, url.trim());
    cachedBaseUrl = url.trim().replace(/\/$/, '');
    if (!cachedBaseUrl.endsWith('/api')) cachedBaseUrl += '/api';
  } else {
    await AsyncStorage.removeItem(STORAGE_CUSTOM_API_KEY);
    cachedBaseUrl = `${getAutoDiscoveredServerHost()}/api`;
  }
}
