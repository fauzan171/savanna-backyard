import { Outlet } from 'react-router-dom';
import { DarkModeToggle } from '@/react-app/components/DarkModeToggle';

export default function AuthLayout() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
			<div className="absolute top-4 right-4">
				<DarkModeToggle />
			</div>
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
				<Outlet />
			</div>
		</div>
	);
}
