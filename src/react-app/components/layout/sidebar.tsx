import * as React from 'react';
import {
	Link,
	NavLink as RouterNavLink,
} from 'react-router-dom';
import {
	LayoutDashboard,
	FileText,
	CreditCard,
	Bike,
	UserCircle,
	BarChart3,
	Settings,
	Menu,
	X,
	ChevronLeft,
	ChevronRight,
	Wrench,
	Package,
	Tag,
	Star,
	Map,
	UserCog,
	CalendarDays,
	Shirt,
	Car,
} from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { useAuthStore, type User } from '@/react-app/features/auth/stores/authStore';

// ============================================
// TYPES
// ============================================

export interface NavItem {
	/** Navigation label */
	label: string;
	/** Navigation href */
	href: string;
	/** Icon component */
	icon?: React.ReactNode;
	/** Badge count or label */
	badge?: string | number;
	/** Children items (for nested navigation) */
	children?: NavItem[];
	/** Roles allowed to see this menu item. Empty means all authenticated users. */
	allowedRoles?: User['role'][];
}

export interface SidebarProps {
	/** Logo/brand element */
	logo?: React.ReactNode;
	/** Navigation items */
	items?: NavItem[];
	/** Footer items (settings, logout, etc.) */
	footerItems?: NavItem[];
	/** Additional class name */
	className?: string;
	/** Controlled collapsed state */
	collapsed?: boolean;
	/** Callback when collapsed state changes */
	onCollapsedChange?: (collapsed: boolean) => void;
	/** Mobile open state (controlled) */
	mobileOpen?: boolean;
	/** Callback when mobile open state changes */
	onMobileOpenChange?: (open: boolean) => void;
}

// ============================================
// DEFAULT NAVIGATION ITEMS
// ============================================

const defaultNavItems: NavItem[] = [
	{
		label: 'Beranda',
		href: '/',
		icon: <LayoutDashboard className="size-5" />,
	},
	{
		label: 'Booking',
		href: '/bookings',
		icon: <FileText className="size-5" />,
	},
	{
		label: 'Pembayaran',
		href: '/payments',
		icon: <CreditCard className="size-5" />,
		children: [
			{ label: 'Semua Pembayaran', href: '/payments' },
			{ label: 'Ringkasan', href: '/payments/dashboard' },
		],
	},
	{
		label: 'Kendaraan',
		href: '/vehicles',
		icon: <Bike className="size-5" />,
	},
	{
		label: 'Ketersediaan',
		href: '/vehicles/availability',
		icon: <Car className="size-5" />,
	},
	{
		label: 'Kalender',
		href: '/calendar',
		icon: <CalendarDays className="size-5" />,
	},
	{
		label: 'Pelanggan',
		href: '/customers',
		icon: <UserCircle className="size-5" />,
	},
	{
		label: 'Perlengkapan',
		href: '/equipment',
		icon: <Shirt className="size-5" />,
	},
	{
		label: 'Perawatan',
		href: '/maintenance',
		icon: <Wrench className="size-5" />,
	},
	{
		label: 'Paket',
		href: '/packages',
		icon: <Package className="size-5" />,
	},
	{
		label: 'Harga',
		href: '/pricing',
		icon: <Tag className="size-5" />,
	},
	{
		label: 'Ulasan',
		href: '/reviews',
		icon: <Star className="size-5" />,
	},
	{
		label: 'Rute',
		href: '/trails',
		icon: <Map className="size-5" />,
	},
	{
		label: 'Laporan',
		href: '/reports',
		icon: <BarChart3 className="size-5" />,
	},
];

const defaultFooterItems: NavItem[] = [
	{
		label: 'Pengaturan',
		href: '/settings',
		icon: <Settings className="size-5" />,
	},
	{
		label: 'Pengguna',
		href: '/users',
		icon: <UserCog className="size-5" />,
		allowedRoles: ['SUPER_ADMIN'],
	},
];

// ============================================
// SIDEBAR ITEM COMPONENT
// ============================================

interface SidebarItemProps {
	item: NavItem;
	collapsed?: boolean;
	onItemClick?: () => void;
}

function SidebarItem({ item, collapsed, onItemClick }: SidebarItemProps) {
	return (
		<RouterNavLink
			to={item.href}
			onClick={onItemClick}
			className={({ isActive }) =>
				cn(
					'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
					'hover:bg-accent hover:text-accent-foreground',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
					isActive
						? 'bg-primary/15 text-primary font-semibold'
						: 'text-muted-foreground',
					collapsed && 'justify-center px-2'
				)
			}
		>
			{({ isActive }) => (
				<>
					{item.icon && (
						<span className={cn('shrink-0', isActive && 'text-primary')}>
							{item.icon}
						</span>
					)}
					{!collapsed && (
						<>
							<span className="flex-1 truncate">{item.label}</span>
							{item.badge && (
								<Badge
									variant={isActive ? 'primary' : 'default'}
									size="sm"
									className="ml-auto"
								>
									{item.badge}
								</Badge>
							)}
						</>
					)}
				</>
			)}
		</RouterNavLink>
	);
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

function Sidebar({
	logo,
	items = defaultNavItems,
	footerItems = defaultFooterItems,
	className,
	collapsed: controlledCollapsed,
	onCollapsedChange,
	mobileOpen: controlledMobileOpen,
	onMobileOpenChange,
}: SidebarProps) {
	const { user } = useAuthStore();
	// Internal state for uncontrolled mode
	const [internalCollapsed, setInternalCollapsed] = React.useState(false);
	const [internalMobileOpen, setInternalMobileOpen] = React.useState(false);

	// Use controlled or internal state
	const collapsed = controlledCollapsed ?? internalCollapsed;
	const mobileOpen = controlledMobileOpen ?? internalMobileOpen;
	const canSeeItem = (item: NavItem) => !item.allowedRoles || (user && item.allowedRoles.includes(user.role));
	const visibleItems = items.filter(canSeeItem);
	const visibleFooterItems = footerItems.filter(canSeeItem);

	const handleCollapsedChange = (value: boolean) => {
		setInternalCollapsed(value);
		onCollapsedChange?.(value);
	};

	const handleMobileOpenChange = (value: boolean) => {
		setInternalMobileOpen(value);
		onMobileOpenChange?.(value);
	};

	const sidebarContent = (
		<div
			className={cn(
				'flex h-full flex-col bg-card border-r border-border shadow-lg md:shadow-none transition-all duration-300',
				collapsed ? 'w-16' : 'w-64',
				className
			)}
		>
			{/* Logo Header */}
			<div className="flex h-16 items-center justify-between border-b border-border px-4 bg-card">
				{!collapsed && (
					<Link to="/" className="flex items-center gap-2">
						{logo || (
							<span className="font-display text-xl font-bold text-primary">
								Savanna
							</span>
						)}
					</Link>
				)}
				{collapsed && (
					<span className="font-display text-xl font-bold text-primary mx-auto">
						S
					</span>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto p-3 space-y-1 bg-muted">
				{visibleItems.map((item) => (
					<SidebarItem
						key={item.href}
						item={item}
						collapsed={collapsed}
						onItemClick={() => handleMobileOpenChange(false)}
					/>
				))}
			</nav>

			{/* Footer Items */}
			{visibleFooterItems.length > 0 && (
				<div className="border-t border-border p-3 space-y-1 bg-card">
					{visibleFooterItems.map((item) => (
						<SidebarItem
							key={item.href}
							item={item}
							collapsed={collapsed}
							onItemClick={() => handleMobileOpenChange(false)}
						/>
					))}
				</div>
			)}

			{/* Collapse Toggle (Desktop) */}
			<div className="hidden md:flex border-t border-border p-2">
				<Button
					variant="ghost"
					size="sm"
					className="w-full justify-center"
					onClick={() => handleCollapsedChange(!collapsed)}
				>
					{collapsed ? (
						<ChevronRight className="size-4" />
					) : (
						<>
							<ChevronLeft className="size-4 mr-2" />
							<span>Tutup</span>
						</>
					)}
				</Button>
			</div>
		</div>
	);

	return (
		<>
		{/* Mobile Menu Button */}
			<Button
				variant="ghost"
				size="icon"
				className="md:hidden fixed top-3 left-3 z-[51] h-10 w-10 bg-card border border-border shadow-md"
				onClick={() => handleMobileOpenChange(!mobileOpen)}
			>
				{mobileOpen ? (
					<X className="size-5" />
				) : (
					<Menu className="size-5" />
				)}
			</Button>

			{/* Mobile Overlay */}
			{mobileOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black/50 z-40"
					onClick={() => handleMobileOpenChange(false)}
				/>
			)}

			{/* Sidebar */}
			{/* Desktop: Always visible */}
			<div className="hidden md:block h-full">{sidebarContent}</div>

			{/* Mobile: Slide-in drawer */}
			<div
				className={cn(
					'md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-2xl transform transition-transform duration-300',
					mobileOpen ? 'translate-x-0' : '-translate-x-full'
				)}
			>
				{sidebarContent}
			</div>
		</>
	);
}

// ============================================
// COMPOSED EXPORTS
// ============================================

export { Sidebar, SidebarItem, defaultNavItems, defaultFooterItems };
