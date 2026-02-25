import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useAuth() {
	const { user, isAuthenticated, isLoading, login, logout, fetchUser } = useAuthStore();
	const navigate = useNavigate();

	const handleLogin = useCallback(
		async (email: string, password: string) => {
			await login(email, password);
			navigate('/');
		},
		[login, navigate]
	);

	const handleLogout = useCallback(() => {
		logout();
		navigate('/login');
	}, [logout, navigate]);

	return {
		user,
		isAuthenticated,
		isLoading,
		login: handleLogin,
		logout: handleLogout,
		fetchUser,
	};
}
