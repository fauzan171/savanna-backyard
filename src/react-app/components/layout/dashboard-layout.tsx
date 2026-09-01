import { NavLink, Outlet } from 'react-router-dom';
import { DarkModeToggle } from '@/react-app/components/DarkModeToggle';
import { Sidebar } from '@/react-app/components/layout/sidebar';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';
import { useState } from 'react';
import { Bike, CalendarDays, FileText, Home } from 'lucide-react';

const mobileQuickNav = [
	{ label: 'Beranda', href: '/', icon: Home },
	{ label: 'Booking', href: '/bookings', icon: FileText },
	{ label: 'Kendaraan', href: '/vehicles', icon: Bike },
	{ label: 'Kalender', href: '/calendar', icon: CalendarDays },
];

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
				<header className="flex h-16 min-h-16 items-center justify-between border-b border-border bg-card px-4 md:h-[72px] md:min-h-[72px] md:px-6">
					<div className="flex min-w-0 items-center gap-3 pl-12 md:gap-4 md:pl-0">
						<span className="truncate text-base text-muted-foreground">
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
				<main className="flex-1 overflow-y-auto bg-muted/30 p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
					<Outlet />
				</main>

				<nav className="fixed inset-x-0 bottom-0 z-30 grid h-[72px] grid-cols-4 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur md:hidden">
					{mobileQuickNav.map((item) => {
						const Icon = item.icon;
						return (
							<NavLink
								key={item.href}
								to={item.href}
								className={({ isActive }) =>
									`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-semibold ${
										isActive ? 'text-primary' : 'text-muted-foreground'
									}`
								}
							>
								<Icon className="size-5" />
								<span className="truncate">{item.label}</span>
							</NavLink>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
