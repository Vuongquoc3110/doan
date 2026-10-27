import axios from 'axios';
import { getApiBaseUrl } from './config';
import { storage } from '../utils/storage';

export const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Dynamic Base URL & Auth token interceptor
apiClient.interceptors.request.use(async (reqConfig) => {
  const baseUrl = await getApiBaseUrl();
  reqConfig.baseURL = baseUrl;

  // Retrieve token
  const token = await storage.getItem('@klever_access_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }

  // Retrieve or create guest session ID
  let sessionId = await storage.getItem('@klever_guest_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    await storage.setItem('@klever_guest_session_id', sessionId);
  }
  if (reqConfig.headers) {
    reqConfig.headers['x-session-id'] = sessionId;
  }

  return reqConfig;
});

let refreshPromise: Promise<string> | null = null;
async function expireSession() {
  const { useAuthStore } = await import('../store/useAuthStore');
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  await Promise.all(['@klever_access_token', '@klever_refresh_token', '@klever_user_info'].map(key => storage.removeItem(key)));
}
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await storage.getItem('@klever_refresh_token');
  if (!refreshToken) {
    await expireSession();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  try {
    const baseUrl = await getApiBaseUrl();
    const response = await axios.post(`${baseUrl}/v1/auth/refresh`, { refreshToken }, { timeout: 15000 });
    const accessToken = response.data?.data?.accessToken;
    if (!accessToken) {
      await expireSession();
      throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    }
    await storage.setItem('@klever_access_token', accessToken);
    return accessToken;
  } catch (error) {
    // Preserve the session during temporary network or server failures.
    if (axios.isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) await expireSession();
    throw error;
  }
}

// Response error handler
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh on 401
    const isAuthRequest = /\/auth\/(login|register|refresh|forgot-password)(?:[/?]|$)/.test(originalRequest?.url ?? '');
    if (error.response?.status === 401 && originalRequest && !isAuthRequest && originalRequest._retry) await expireSession();
    if (error.response?.status === 401 && originalRequest && !isAuthRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        let accessToken = await storage.getItem('@klever_access_token');
        if (!accessToken || originalRequest.headers.Authorization === `Bearer ${accessToken}`) {
          if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
          accessToken = await refreshPromise;
        }
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    const message =
      error.response?.data?.message ||
      (error.message === 'Network Error'
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Wi-Fi hoặc mở màn hình "Kiểm tra kết nối".'
        : error.message);

    return Promise.reject(new Error(message));
  }
);

export { resolveMediaUrl } from '../utils/media';
export default apiClient;
