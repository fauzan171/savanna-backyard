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
					// Use raw fetch to bypass api-client's 401 redirect logic,
					// which would cause an infinite reload loop on expired sessions.
					const response = await fetch('/api/v1/auth/me', {
						credentials: 'include',
					});
					if (!response.ok) {
						throw new Error('Not authenticated');
					}
					const json = await response.json();
					set({ user: json.data, isAuthenticated: true, isLoading: false });
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
