import { Outlet } from 'react-router-dom';
import { DarkModeToggle } from '@/react-app/components/DarkModeToggle';
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';

export default function DashboardLayout() {
	const { user, logout } = useAuthStore();

	return (
		<div className="flex h-screen">
			{/* Sidebar */}
			<aside className="w-64 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
				<div className="flex h-16 items-center justify-center border-b border-gray-200 dark:border-gray-700">
					<h1 className="text-xl font-bold text-gray-900 dark:text-white">Savanna</h1>
				</div>
				<nav className="p-4">
					<ul className="space-y-2">
						<li>
							<a
								href="/"
								className="block rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
							>
								Dashboard
							</a>
						</li>
					</ul>
				</nav>
			</aside>

			{/* Main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Header */}
				<header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-center gap-4">
						<span className="text-sm text-gray-500 dark:text-gray-400">
							Welcome, {user?.name}
						</span>
						<span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
							{user?.role}
						</span>
					</div>
					<div className="flex items-center gap-4">
						<DarkModeToggle />
						<button
							onClick={logout}
							className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
						>
							Logout
						</button>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-900">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
