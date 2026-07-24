import { useAuthStore } from '../stores/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export function useAuth() {
	const { user, isAuthenticated, isLoading, login, logout, fetchUser } = useAuthStore();
	const navigate = useNavigate();
	const location = useLocation();

	const handleLogin = useCallback(
		async (email: string, password: string) => {
			await login(email, password);
			// BUG#18: redirect back to the originally requested page (deep-link)
			// instead of always landing on '/'. AuthGuard stores `from` in state.
			const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
			navigate(from && from !== '/login' ? from : '/');
		},
		[login, navigate, location.state]
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
