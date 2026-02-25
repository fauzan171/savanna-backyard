import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/react-app/lib/api-client';

export interface User {
	id: string;
	name: string;
	email: string;
	role: 'SUPER_ADMIN' | 'STAFF';
}

interface AuthState {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			user: null,
			isAuthenticated: false,
			isLoading: true,

			login: async (email, password) => {
				const response = await api.post<{ data: User }>('/v1/auth/login', { email, password });
				set({ user: response.data, isAuthenticated: true });
			},

			logout: () => {
				api.post('/v1/auth/logout', {}).catch(() => {});
				set({ user: null, isAuthenticated: false });
			},

			fetchUser: async () => {
				try {
					const response = await api.get<{ data: User }>('/v1/auth/me');
					set({ user: response.data, isAuthenticated: true, isLoading: false });
				} catch {
					set({ user: null, isAuthenticated: false, isLoading: false });
				}
			},
		}),
		{
			name: 'auth-storage',
			partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
		}
	)
);
