import { create } from 'zustand';
import apiClient from '../api/client';
import { storage } from '../utils/storage';

export interface User {
  id: number;
  phone: string;
  email?: string | null;
  fullName: string;
  role: 'customer' | 'staff' | 'admin';
  avatar?: string | null;
  status: 'active' | 'blocked';
  tier?: 'bronze' | 'silver' | 'gold' | 'diamond';
  points?: number;
  store_id?: number;
  store_name?: string;
  position?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ portal: string; role: string }>;
  register: (payload: { phone: string; fullName: string; password: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      const token = await storage.getItem('@klever_access_token');
      const userStr = await storage.getItem('@klever_user_info');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
        // Refresh profile in background
        apiClient.get('/v1/me/profile').then((res) => {
          if (res.data?.data) {
            const updated = { ...user, ...res.data.data };
            set({ user: updated });
            storage.setItem('@klever_user_info', JSON.stringify(updated));
          }
        }).catch(() => {});
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (phone: string, password: string) => {
    const res = await apiClient.post('/v1/auth/login', { phone, password });
    const { user, tokens, portal } = res.data.data;

    await storage.setItem('@klever_access_token', tokens.accessToken);
    await storage.setItem('@klever_refresh_token', tokens.refreshToken);
    await storage.setItem('@klever_user_info', JSON.stringify(user));

    set({ user, isAuthenticated: true });
    return { portal, role: user.role };
  },

  register: async (payload) => {
    const res = await apiClient.post('/v1/auth/register', payload);
    const { user, tokens } = res.data.data;

    await storage.setItem('@klever_access_token', tokens.accessToken);
    await storage.setItem('@klever_refresh_token', tokens.refreshToken);
    await storage.setItem('@klever_user_info', JSON.stringify(user));

    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    const pushToken=await storage.getItem('@klever_push_token');
    if(pushToken)await apiClient.delete('/v1/me/push-devices',{data:{token:pushToken}}).catch(()=>{});
    await storage.removeItem('@klever_push_token');
    await storage.removeItem('@klever_access_token');
    await storage.removeItem('@klever_refresh_token');
    await storage.removeItem('@klever_user_info');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (partial) => {
    const current = get().user;
    if (current) {
      const updated = { ...current, ...partial };
      set({ user: updated });
      storage.setItem('@klever_user_info', JSON.stringify(updated));
    }
  },
}));
