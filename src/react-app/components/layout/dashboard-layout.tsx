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
				<header className="flex h-14 md:h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
					<div className="flex items-center gap-3 md:gap-4 pl-10 md:pl-0">
						<span className="text-sm text-muted-foreground">
							Selamat datang, <span className="font-medium text-foreground">{user?.name}</span>
						</span>
						<Badge variant="primary" size="sm" className="hidden sm:inline-flex">
							{user?.role}
						</Badge>
					</div>
					<div className="flex items-center gap-2 md:gap-4">
						<DarkModeToggle />
						<Button variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
							Keluar
						</Button>
						<Button variant="ghost" size="icon" onClick={logout} className="sm:hidden">
							<span className="sr-only">Keluar</span>
							<svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
							</svg>
						</Button>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto bg-muted/30 p-3 md:p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
