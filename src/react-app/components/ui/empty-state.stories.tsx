import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './empty-state';
import { Button } from './button';
import { FileText, Calendar, Users, Package } from 'lucide-react';

const meta = {
	title: 'UI/EmptyState',
	component: EmptyState,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
		type: {
			control: 'select',
			options: ['default', 'no-results', 'error', 'success'],
		},
	},
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: 'No data yet',
		description: 'There is no data to display at the moment.',
	},
};

export const NoResults: Story = {
	args: {
		title: 'No results found',
		description: 'Try adjusting your search or filters.',
		type: 'no-results',
	},
};

export const Error: Story = {
	args: {
		title: 'Something went wrong',
		description: 'An error occurred while loading data.',
		type: 'error',
	},
};

export const Success: Story = {
	args: {
		title: 'All done!',
		description: 'You have completed all tasks.',
		type: 'success',
	},
};

export const WithAction: Story = {
	args: {
		title: 'No bookings yet',
		description: 'Create your first booking to get started.',
		action: <Button>Create Booking</Button>,
	},
};

export const Small: Story = {
	args: {
		title: 'Empty',
		description: 'No items.',
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		title: 'No data available',
		description: 'Start by adding some data to see it here.',
		size: 'lg',
	},
};

export const WithCustomIcon: Story = {
	args: {
		title: 'No documents',
		description: 'Upload your first document to get started.',
		icon: <FileText className="size-14 text-muted-foreground" />,
		action: <Button>Upload Document</Button>,
	},
};

export const BookingsEmpty: Story = {
	render: () => (
		<EmptyState
			title="No bookings found"
			description="There are no bookings matching your criteria. Try adjusting your filters or create a new booking."
			icon={<Calendar className="size-14 text-muted-foreground" />}
			action={<Button>Create Booking</Button>}
			className="w-96 border border-dashed rounded-lg"
		/>
	),
};

export const CustomersEmpty: Story = {
	render: () => (
		<EmptyState
			title="No customers yet"
			description="Add your first customer to start managing their bookings."
			icon={<Users className="size-14 text-muted-foreground" />}
			action={<Button>Add Customer</Button>}
			className="w-96 border border-dashed rounded-lg"
		/>
	),
};

export const VehiclesEmpty: Story = {
	render: () => (
		<EmptyState
			title="No vehicles in fleet"
			description="Add vehicles to your fleet to start accepting bookings."
			icon={<Package className="size-14 text-muted-foreground" />}
			action={<Button>Add Vehicle</Button>}
			className="w-96 border border-dashed rounded-lg"
		/>
	),
};
