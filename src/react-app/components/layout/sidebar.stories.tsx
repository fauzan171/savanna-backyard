import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar, type NavItem } from './sidebar';
import { Home, Users, FileText, Settings, Bike, Calendar, BarChart3 } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';

const meta = {
	title: 'Layout/Sidebar',
	component: Sidebar,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<MemoryRouter>
				<div className="h-screen">
					<Story />
				</div>
			</MemoryRouter>
		),
	],
} satisfies Meta<typeof Sidebar>;

export default meta;

const customNavItems: NavItem[] = [
	{
		label: 'Dashboard',
		href: '/',
		icon: <Home className="size-5" />,
	},
	{
		label: 'Bookings',
		href: '/bookings',
		icon: <Calendar className="size-5" />,
		badge: 5,
	},
	{
		label: 'Vehicles',
		href: '/vehicles',
		icon: <Bike className="size-5" />,
	},
	{
		label: 'Customers',
		href: '/customers',
		icon: <Users className="size-5" />,
	},
	{
		label: 'Reports',
		href: '/reports',
		icon: <BarChart3 className="size-5" />,
	},
];

const customFooterItems: NavItem[] = [
	{
		label: 'Settings',
		href: '/settings',
		icon: <Settings className="size-5" />,
	},
];

export const Default: Story = {
	render: () => <Sidebar />,
};

export const CustomItems: Story = {
	render: () => <Sidebar items={customNavItems} footerItems={customFooterItems} />,
};

export const Collapsed: Story = {
	render: () => <Sidebar collapsed />,
};

export const CustomLogo: Story = {
	render: () => (
		<Sidebar
			items={customNavItems}
			logo={
				<div className="flex items-center gap-2">
					<div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
						S
					</div>
					<span className="font-display text-lg font-bold">Savanna Moto</span>
				</div>
			}
		/>
	),
};

export const WithBadges: Story = {
	render: () => (
		<Sidebar
			items={[
				{ label: 'Dashboard', href: '/', icon: <Home className="size-5" /> },
				{ label: 'New Leads', href: '/leads', icon: <Users className="size-5" />, badge: 'New' },
				{ label: 'Pending', href: '/pending', icon: <FileText className="size-5" />, badge: 12 },
				{ label: 'Urgent', href: '/urgent', icon: <Calendar className="size-5" />, badge: 3 },
			]}
		/>
	),
};

export const Minimal: Story = {
	render: () => (
		<Sidebar
			items={[
				{ label: 'Home', href: '/' },
				{ label: 'About', href: '/about' },
				{ label: 'Contact', href: '/contact' },
			]}
			footerItems={[]}
		/>
	),
};
