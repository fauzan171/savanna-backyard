import * as React from 'react';
import {
	Link,
	NavLink as RouterNavLink,
} from 'react-router-dom';
import {
	LayoutDashboard,
	Users,
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
} from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';

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
		label: 'Dashboard',
		href: '/',
		icon: <LayoutDashboard className="size-5" />,
	},
	{
		label: 'Leads',
		href: '/leads',
		icon: <Users className="size-5" />,
		badge: 'New',
	},
	{
		label: 'Bookings',
		href: '/bookings',
		icon: <FileText className="size-5" />,
	},
	{
		label: 'Payments',
		href: '/payments',
		icon: <CreditCard className="size-5" />,
	},
	{
		label: 'Vehicles',
		href: '/vehicles',
		icon: <Bike className="size-5" />,
	},
	{
		label: 'Customers',
		href: '/customers',
		icon: <UserCircle className="size-5" />,
	},
	{
		label: 'Maintenance',
		href: '/maintenance',
		icon: <Wrench className="size-5" />,
	},
	{
		label: 'Packages',
		href: '/packages',
		icon: <Package className="size-5" />,
	},
	{
		label: 'Pricing',
		href: '/pricing',
		icon: <Tag className="size-5" />,
	},
	{
		label: 'Reviews',
		href: '/reviews',
		icon: <Star className="size-5" />,
	},
	{
		label: 'Trails',
		href: '/trails',
		icon: <Map className="size-5" />,
	},
	{
		label: 'Reports',
		href: '/reports',
		icon: <BarChart3 className="size-5" />,
	},
];

const defaultFooterItems: NavItem[] = [
	{
		label: 'Settings',
		href: '/settings',
		icon: <Settings className="size-5" />,
	},
	{
		label: 'Users',
		href: '/users',
		icon: <UserCog className="size-5" />,
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
					'hover:bg-muted hover:text-foreground',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
					isActive
						? 'bg-primary/10 text-primary hover:bg-primary/15'
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
	// Internal state for uncontrolled mode
	const [internalCollapsed, setInternalCollapsed] = React.useState(false);
	const [internalMobileOpen, setInternalMobileOpen] = React.useState(false);

	// Use controlled or internal state
	const collapsed = controlledCollapsed ?? internalCollapsed;
	const mobileOpen = controlledMobileOpen ?? internalMobileOpen;

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
				'flex h-full flex-col bg-card border-r border-border transition-all duration-300',
				collapsed ? 'w-16' : 'w-64',
				className
			)}
		>
			{/* Logo Header */}
			<div className="flex h-16 items-center justify-between border-b border-border px-4">
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
			<nav className="flex-1 overflow-y-auto p-3 space-y-1">
				{items.map((item) => (
					<SidebarItem
						key={item.href}
						item={item}
						collapsed={collapsed}
						onItemClick={() => handleMobileOpenChange(false)}
					/>
				))}
			</nav>

			{/* Footer Items */}
			{footerItems.length > 0 && (
				<div className="border-t border-border p-3 space-y-1">
					{footerItems.map((item) => (
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
							<span>Collapse</span>
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
				className="md:hidden fixed top-4 left-4 z-50"
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
					'md:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300',
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
