import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';

export function AuthGuard() {
	const { isAuthenticated, isLoading } = useAuthStore();
	const location = useLocation();

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
}
