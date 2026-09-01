import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type User } from '@/react-app/features/auth/stores/authStore';

interface RoleGuardProps {
	allowedRoles: User['role'][];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
	const { user } = useAuthStore();

	if (!user || !allowedRoles.includes(user.role)) {
		return <Navigate to="/" replace />;
	}

	return <Outlet />;
}
