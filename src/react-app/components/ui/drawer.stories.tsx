import type { Meta, StoryObj } from '@storybook/react';
import { Drawer, DrawerHeader, DrawerFooter, DrawerContent } from './drawer';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { useState } from 'react';

const meta = {
	title: 'UI/Drawer',
	component: Drawer,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Drawer>;

export default meta;

export const Default: Story = {
	render: function DefaultStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Open Drawer</Button>
				<Drawer
					open={open}
					onOpenChange={setOpen}
					title="Drawer Title"
					description="This is a drawer description"
				>
					<p className="text-sm text-muted-foreground">
						Drawer content goes here. This is a side panel that slides in from the right.
					</p>
				</Drawer>
			</>
		);
	},
};

export const LeftPosition: Story = {
	render: function LeftPositionStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Open Left Drawer</Button>
				<Drawer
					open={open}
					onOpenChange={setOpen}
					title="Left Drawer"
					position="left"
				>
					<p className="text-sm text-muted-foreground">
						This drawer slides in from the left side.
					</p>
				</Drawer>
			</>
		);
	},
};

export const WithForm: Story = {
	render: function WithFormStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Edit Booking</Button>
				<Drawer
					open={open}
					onOpenChange={setOpen}
					title="Edit Booking"
					description="Update booking details"
				>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="customer">Customer Name</Label>
							<Input id="customer" defaultValue="John Doe" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" type="email" defaultValue="john@example.com" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="phone">Phone</Label>
							<Input id="phone" defaultValue="+62 812-3456-7890" />
						</div>
					</div>
					<div className="mt-6 flex gap-2 justify-end">
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={() => setOpen(false)}>
							Save Changes
						</Button>
					</div>
				</Drawer>
			</>
		);
	},
};

export const WithSections: Story = {
	render: function WithSectionsStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>View Details</Button>
				<Drawer
					open={open}
					onOpenChange={setOpen}
					title="Booking Details"
					size="lg"
				>
					<DrawerContent className="space-y-6">
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-2">Customer</h4>
							<p className="font-medium">John Doe</p>
							<p className="text-sm text-muted-foreground">john@example.com</p>
						</div>
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-2">Vehicle</h4>
							<p className="font-medium">Honda CRF250 Rally</p>
							<p className="text-sm text-muted-foreground">License: B 1234 XY</p>
						</div>
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-2">Rental Period</h4>
							<p className="font-medium">3 Days</p>
							<p className="text-sm text-muted-foreground">15 Jan - 18 Jan 2025</p>
						</div>
						<div>
							<h4 className="text-sm font-medium text-muted-foreground mb-2">Total</h4>
							<p className="text-xl font-bold">Rp 4.500.000</p>
						</div>
					</DrawerContent>
				</Drawer>
			</>
		);
	},
};

export const Small: Story = {
	render: function SmallStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Small Drawer</Button>
				<Drawer
					open={open}
					onOpenChange={setOpen}
					title="Small Drawer"
					size="sm"
				>
					<p className="text-sm text-muted-foreground">
						This is a small drawer.
					</p>
				</Drawer>
			</>
		);
	},
};

export const WithoutClose: Story = {
	render: function WithoutCloseStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>No Close Button</Button>
				<Drawer
					open={open}
					onOpenChange={setOpen}
					title="No Close"
					showClose={false}
				>
					<p className="text-sm text-muted-foreground">
						This drawer has no close button.
					</p>
					<Button className="mt-4" onClick={() => setOpen(false)}>
						Close
					</Button>
				</Drawer>
			</>
		);
	},
};
