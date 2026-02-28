import { Outlet } from 'react-router-dom';
import { DarkModeToggle } from '@/react-app/components/DarkModeToggle';
import { Sidebar } from '@/react-app/components/layout/sidebar';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';
import { useState } from 'react';

export default function DashboardLayout() {
	const { user, logout } = useAuthStore();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	return (
		<div className="flex h-screen bg-background">
			{/* Sidebar */}
			<Sidebar
				mobileOpen={mobileOpen}
				onMobileOpenChange={setMobileOpen}
				collapsed={collapsed}
				onCollapsedChange={setCollapsed}
			/>

			{/* Main content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Header */}
				<header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
					<div className="flex items-center gap-4">
						<span className="text-sm text-muted-foreground">
							Welcome, <span className="font-medium text-foreground">{user?.name}</span>
						</span>
						<Badge variant="primary" size="sm">
							{user?.role}
						</Badge>
					</div>
					<div className="flex items-center gap-4">
						<DarkModeToggle />
						<Button variant="ghost" size="sm" onClick={logout}>
							Logout
						</Button>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto bg-muted/30 p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
