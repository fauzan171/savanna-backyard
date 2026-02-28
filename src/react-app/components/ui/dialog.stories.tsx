import type { Meta, StoryObj } from '@storybook/react';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta = {
	title: 'UI/Dialog',
	component: Dialog,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;

export const Default: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Open Dialog</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Dialog Title</DialogTitle>
					<DialogDescription>
						This is a description of the dialog. It provides context for the user.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<p className="text-sm text-muted-foreground">
						Dialog content goes here. You can put any content you want.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	),
};

export const Small: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm">Small Dialog</Button>
			</DialogTrigger>
			<DialogContent size="sm">
				<DialogHeader>
					<DialogTitle>Small Dialog</DialogTitle>
				</DialogHeader>
				<p className="text-sm">This is a small dialog.</p>
			</DialogContent>
		</Dialog>
	),
};

export const Large: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Large Dialog</Button>
			</DialogTrigger>
			<DialogContent size="lg">
				<DialogHeader>
					<DialogTitle>Large Dialog</DialogTitle>
					<DialogDescription>This is a large dialog with more space.</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-4 py-4">
					<div className="h-24 bg-muted rounded-md" />
					<div className="h-24 bg-muted rounded-md" />
				</div>
			</DialogContent>
		</Dialog>
	),
};

export const WithForm: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Create Booking</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Booking</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new booking.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="name">Customer Name</Label>
						<Input id="name" placeholder="Enter name" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" placeholder="Enter email" />
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button>Save Booking</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const WithoutCloseButton: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>No Close Button</Button>
			</DialogTrigger>
			<DialogContent showClose={false}>
				<DialogHeader>
					<DialogTitle>Custom Dialog</DialogTitle>
				</DialogHeader>
				<p className="text-sm">This dialog has no close button in the corner.</p>
				<DialogFooter>
					<DialogClose asChild>
						<Button>Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	),
};

export const DrawerRight: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Open Drawer</Button>
			</DialogTrigger>
			<DialogContent position="right">
				<DialogHeader>
					<DialogTitle>Side Panel</DialogTitle>
					<DialogDescription>
						This is a drawer that slides in from the right.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<p className="text-sm text-muted-foreground">
						Drawer content goes here.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	),
};

export const DrawerBottom: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Bottom Sheet</Button>
			</DialogTrigger>
			<DialogContent position="bottom">
				<DialogHeader>
					<DialogTitle>Bottom Sheet</DialogTitle>
				</DialogHeader>
				<div className="py-4">
					<p className="text-sm">This slides up from the bottom.</p>
				</div>
			</DialogContent>
		</Dialog>
	),
};
