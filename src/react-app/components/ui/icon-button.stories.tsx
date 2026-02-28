import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from './icon-button';
import { MoreHorizontal, Edit, Trash2, Plus, Settings, Search } from 'lucide-react';
import { TooltipProvider } from './tooltip';

const meta = {
	title: 'UI/IconButton',
	component: IconButton,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<TooltipProvider>
				<Story />
			</TooltipProvider>
		),
	],
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
		variant: {
			control: 'select',
			options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
		},
	},
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		icon: <Settings className="size-4" />,
		label: 'Settings',
	},
};

export const Small: Story = {
	args: {
		icon: <Edit className="size-3" />,
		label: 'Edit',
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		icon: <Edit className="size-5" />,
		label: 'Edit',
		size: 'lg',
	},
};

export const Outline: Story = {
	args: {
		icon: <Plus className="size-4" />,
		label: 'Add',
		variant: 'outline',
	},
};

export const Ghost: Story = {
	args: {
		icon: <MoreHorizontal className="size-4" />,
		label: 'More options',
		variant: 'ghost',
	},
};

export const Destructive: Story = {
	args: {
		icon: <Trash2 className="size-4" />,
		label: 'Delete',
		variant: 'destructive',
	},
};

export const WithoutTooltip: Story = {
	args: {
		icon: <Search className="size-4" />,
		label: 'Search',
		showTooltip: false,
	},
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<IconButton icon={<Edit className="size-4" />} label="Edit" variant="default" />
			<IconButton icon={<Edit className="size-4" />} label="Edit" variant="outline" />
			<IconButton icon={<Edit className="size-4" />} label="Edit" variant="ghost" />
			<IconButton icon={<Edit className="size-4" />} label="Edit" variant="secondary" />
			<IconButton icon={<Trash2 className="size-4" />} label="Delete" variant="destructive" />
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<IconButton icon={<Edit className="size-3" />} label="Edit" size="sm" />
			<IconButton icon={<Edit className="size-4" />} label="Edit" size="md" />
			<IconButton icon={<Edit className="size-5" />} label="Edit" size="lg" />
		</div>
	),
};

export const Disabled: Story = {
	args: {
		icon: <Settings className="size-4" />,
		label: 'Settings',
		disabled: true,
	},
};

export const TableActions: Story = {
	render: () => (
		<div className="flex items-center gap-1">
			<IconButton icon={<Edit className="size-4" />} label="Edit" variant="ghost" size="sm" />
			<IconButton icon={<Trash2 className="size-4" />} label="Delete" variant="ghost" size="sm" />
			<IconButton icon={<MoreHorizontal className="size-4" />} label="More" variant="ghost" size="sm" />
		</div>
	),
};
