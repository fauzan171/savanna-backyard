import type { Meta, StoryObj } from '@storybook/react';
import { PageHeader, PageHeaderCompact } from './page-header';
import { Button } from '@/react-app/components/ui/button';
import { MemoryRouter } from 'react-router-dom';
import { Plus, Download, Filter } from 'lucide-react';

const meta = {
	title: 'Layout/PageHeader',
	component: PageHeader,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<MemoryRouter>
				<Story />
			</MemoryRouter>
		),
	],
} satisfies Meta<typeof PageHeader>;

export default meta;

export const Default: Story = {
	args: {
		title: 'Bookings',
		description: 'Manage your vehicle rental bookings',
	},
};

export const WithBreadcrumb: Story = {
	args: {
		title: 'Booking Details',
		description: 'View and manage this booking',
		breadcrumb: [
			{ label: 'Dashboard', href: '/' },
			{ label: 'Bookings', href: '/bookings' },
			{ label: 'Booking #BK-2025-001' },
		],
	},
};

export const WithActions: Story = {
	args: {
		title: 'Vehicles',
		description: 'Manage your rental fleet',
		actions: (
			<>
				<Button variant="outline" size="sm">
					<Filter className="size-4 mr-2" />
					Filter
				</Button>
				<Button size="sm">
					<Plus className="size-4 mr-2" />
					Add Vehicle
				</Button>
			</>
		),
	},
};

export const Complete: Story = {
	args: {
		title: 'All Bookings',
		description: 'View and manage all vehicle rental bookings',
		breadcrumb: [
			{ label: 'Dashboard', href: '/' },
			{ label: 'Bookings' },
		],
		actions: (
			<>
				<Button variant="outline" size="sm">
					<Download className="size-4 mr-2" />
					Export
				</Button>
				<Button size="sm">
					<Plus className="size-4 mr-2" />
					New Booking
				</Button>
			</>
		),
	},
};

export const WithoutBorder: Story = {
	args: {
		title: 'Dashboard',
		description: 'Overview of your rental business',
		bordered: false,
	},
};

export const Sticky: Story = {
	render: () => (
		<div className="h-64 overflow-y-auto border rounded-lg">
			<PageHeader
				title="Sticky Header"
				description="This header sticks to the top when scrolling"
				sticky
				bordered
			/>
			<div className="p-4 space-y-4">
				{Array.from({ length: 20 }).map((_, i) => (
					<p key={i} className="text-sm text-muted-foreground">
						Content line {i + 1} - Scroll down to see the sticky header behavior.
					</p>
				))}
			</div>
		</div>
	),
};

export const LongTitle: Story = {
	args: {
		title: 'Very Long Page Title That Should Truncate When There Is Not Enough Space',
		description: 'This demonstrates how the header handles long titles',
		actions: (
			<Button size="sm">Action</Button>
		),
	},
};

export const Compact: Story = {
	render: () => (
		<PageHeaderCompact
			title="Settings"
			actions={
				<Button size="sm">Save Changes</Button>
			}
		/>
	),
};

export const CompactNoActions: Story = {
	render: () => <PageHeaderCompact title="Profile" />,
};

export const MultipleActions: Story = {
	args: {
		title: 'Leads',
		description: 'Manage your sales leads and prospects',
		actions: (
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="sm">View All</Button>
				<Button variant="outline" size="sm">Export</Button>
				<Button variant="outline" size="sm">Import</Button>
				<Button size="sm">Add Lead</Button>
			</div>
		),
	},
};

export const SimpleBreadcrumb: Story = {
	args: {
		title: 'Edit Booking',
		breadcrumb: [
			{ label: 'Bookings', href: '/bookings' },
			{ label: 'Edit' },
		],
	},
};
