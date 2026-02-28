import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
	title: 'UI/Tabs',
	component: Tabs,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;

export const Default: Story = {
	render: () => (
		<Tabs defaultValue="tab1" className="w-96">
			<TabsList>
				<TabsTrigger value="tab1">Tab 1</TabsTrigger>
				<TabsTrigger value="tab2">Tab 2</TabsTrigger>
				<TabsTrigger value="tab3">Tab 3</TabsTrigger>
			</TabsList>
			<TabsContent value="tab1" className="p-4">
				<p className="text-sm">Content for Tab 1</p>
			</TabsContent>
			<TabsContent value="tab2" className="p-4">
				<p className="text-sm">Content for Tab 2</p>
			</TabsContent>
			<TabsContent value="tab3" className="p-4">
				<p className="text-sm">Content for Tab 3</p>
			</TabsContent>
		</Tabs>
	),
};

export const OutlineVariant: Story = {
	render: () => (
		<Tabs defaultValue="tab1" className="w-96">
			<TabsList variant="outline">
				<TabsTrigger variant="outline" value="tab1">Tab 1</TabsTrigger>
				<TabsTrigger variant="outline" value="tab2">Tab 2</TabsTrigger>
				<TabsTrigger variant="outline" value="tab3">Tab 3</TabsTrigger>
			</TabsList>
			<TabsContent value="tab1" className="p-4">
				<p className="text-sm">Outline variant content</p>
			</TabsContent>
		</Tabs>
	),
};

export const PillsVariant: Story = {
	render: () => (
		<Tabs defaultValue="tab1" className="w-96">
			<TabsList variant="pills">
				<TabsTrigger variant="pills" value="tab1">Tab 1</TabsTrigger>
				<TabsTrigger variant="pills" value="tab2">Tab 2</TabsTrigger>
				<TabsTrigger variant="pills" value="tab3">Tab 3</TabsTrigger>
			</TabsList>
			<TabsContent value="tab1" className="p-4">
				<p className="text-sm">Pills variant content</p>
			</TabsContent>
		</Tabs>
	),
};

export const WithDisabled: Story = {
	render: () => (
		<Tabs defaultValue="tab1" className="w-96">
			<TabsList>
				<TabsTrigger value="tab1">Active</TabsTrigger>
				<TabsTrigger value="tab2" disabled>Disabled</TabsTrigger>
				<TabsTrigger value="tab3">Active</TabsTrigger>
			</TabsList>
		</Tabs>
	),
};

export const BookingStatus: Story = {
	render: () => (
		<Tabs defaultValue="all" className="w-full">
			<TabsList>
				<TabsTrigger value="all">All</TabsTrigger>
				<TabsTrigger value="pending">Pending</TabsTrigger>
				<TabsTrigger value="confirmed">Confirmed</TabsTrigger>
				<TabsTrigger value="active">Active</TabsTrigger>
				<TabsTrigger value="completed">Completed</TabsTrigger>
			</TabsList>
			<TabsContent value="all" className="p-4">
				<p className="text-sm text-muted-foreground">Showing all bookings</p>
			</TabsContent>
		</Tabs>
	),
};
