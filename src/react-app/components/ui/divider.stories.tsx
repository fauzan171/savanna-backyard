import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './divider';

const meta = {
	title: 'UI/Divider',
	component: Divider,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
	argTypes: {
		orientation: {
			control: 'select',
			options: ['horizontal', 'vertical'],
		},
	},
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	render: () => (
		<div className="w-64">
			<p className="text-sm">Content above</p>
			<Divider />
			<p className="text-sm">Content below</p>
		</div>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="w-64">
			<p className="text-sm mb-4">Content above</p>
			<Divider label="OR" />
			<p className="text-sm mt-4">Content below</p>
		</div>
	),
};

export const Dashed: Story = {
	render: () => (
		<div className="w-64">
			<p className="text-sm">Content above</p>
			<Divider dashed />
			<p className="text-sm">Content below</p>
		</div>
	),
};

export const DashedWithLabel: Story = {
	render: () => (
		<div className="w-64">
			<Divider label="Section Break" dashed />
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className="flex items-center h-12 gap-4">
			<span className="text-sm">Left</span>
			<Divider orientation="vertical" className="h-8" />
			<span className="text-sm">Right</span>
		</div>
	),
};

export const FormSections: Story = {
	render: () => (
		<div className="space-y-6 w-80">
			<div>
				<h4 className="font-semibold mb-2">Personal Information</h4>
				<p className="text-sm text-muted-foreground">Name, email, phone</p>
			</div>
			<Divider />
			<div>
				<h4 className="font-semibold mb-2">Address</h4>
				<p className="text-sm text-muted-foreground">Street, city, postal code</p>
			</div>
			<Divider />
			<div>
				<h4 className="font-semibold mb-2">Preferences</h4>
				<p className="text-sm text-muted-foreground">Language, notifications</p>
			</div>
		</div>
	),
};
