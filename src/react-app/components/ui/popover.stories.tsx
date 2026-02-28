import type { Meta, StoryObj } from '@storybook/react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Label } from './label';
import { Input } from './input';

const meta = {
	title: 'UI/Popover',
	component: Popover,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;

export const Default: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button>Open Popover</Button>
			</PopoverTrigger>
			<PopoverContent>
				<div className="space-y-2">
					<h4 className="font-medium text-sm">Popover Title</h4>
					<p className="text-sm text-muted-foreground">
						This is the popover content.
					</p>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button>Quick Edit</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="space-y-4">
					<div className="space-y-2">
						<h4 className="font-medium">Edit Item</h4>
						<p className="text-sm text-muted-foreground">
							Make changes to the item.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input id="name" defaultValue="Item name" />
					</div>
					<Button size="sm" className="w-full">Save</Button>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const ConfirmAction: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="destructive">Delete</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64">
				<div className="space-y-3">
					<p className="text-sm">Are you sure you want to delete this item?</p>
					<div className="flex gap-2 justify-end">
						<Button size="sm" variant="outline">Cancel</Button>
						<Button size="sm" variant="destructive">Delete</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const Alignments: Story = {
	render: () => (
		<div className="flex gap-4">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Align Start</Button>
				</PopoverTrigger>
				<PopoverContent align="start">
					<p className="text-sm">Aligned to start</p>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Align Center</Button>
				</PopoverTrigger>
				<PopoverContent align="center">
					<p className="text-sm">Aligned to center</p>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Align End</Button>
				</PopoverTrigger>
				<PopoverContent align="end">
					<p className="text-sm">Aligned to end</p>
				</PopoverContent>
			</Popover>
		</div>
	),
};
