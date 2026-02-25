import { useAuth } from '@/react-app/features/auth/hooks/useAuth';

export default function DashboardPage() {
	const { user } = useAuth();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Welcome to Savanna Backyard Admin Panel
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{/* Stats cards placeholder */}
				<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Leads</div>
					<div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">-</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">
						Active Bookings
					</div>
					<div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">-</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">Vehicles</div>
					<div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">-</div>
				</div>

				<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
					<div className="text-sm font-medium text-gray-500 dark:text-gray-400">Customers</div>
					<div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">-</div>
				</div>
			</div>

			{/* User info */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Profile</h2>
				<div className="mt-4 space-y-2">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						<span className="font-medium">Name:</span> {user?.name}
					</p>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						<span className="font-medium">Email:</span> {user?.email}
					</p>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						<span className="font-medium">Role:</span> {user?.role}
					</p>
				</div>
			</div>
		</div>
	);
}
