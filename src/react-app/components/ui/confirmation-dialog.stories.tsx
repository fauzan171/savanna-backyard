import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationDialog } from './confirmation-dialog';
import { Button } from './button';
import { useState } from 'react';

const meta = {
	title: 'UI/ConfirmationDialog',
	component: ConfirmationDialog,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof ConfirmationDialog>;

export default meta;

export const Default: Story = {
	render: function DefaultStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Open Dialog</Button>
				<ConfirmationDialog
					open={open}
					onOpenChange={setOpen}
					title="Confirm Action"
					description="Are you sure you want to proceed with this action?"
					onConfirm={() => alert('Confirmed!')}
				/>
			</>
		);
	},
};

export const Danger: Story = {
	render: function DangerStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button variant="destructive" onClick={() => setOpen(true)}>
					Delete Item
				</Button>
				<ConfirmationDialog
					open={open}
					onOpenChange={setOpen}
					title="Delete Item"
					description="Are you sure you want to delete this item? This action cannot be undone."
					variant="danger"
					confirmLabel="Delete"
					onConfirm={() => alert('Deleted!')}
				/>
			</>
		);
	},
};

export const Warning: Story = {
	render: function WarningStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Cancel Booking</Button>
				<ConfirmationDialog
					open={open}
					onOpenChange={setOpen}
					title="Cancel Booking?"
					description="This booking has already been paid. A refund will be processed within 3-5 business days."
					variant="warning"
					confirmLabel="Yes, Cancel"
					onConfirm={() => alert('Cancelled!')}
				/>
			</>
		);
	},
};

export const WithLoading: Story = {
	render: function WithLoadingStory() {
		const [open, setOpen] = useState(false);
		const [isLoading, setIsLoading] = useState(false);

		const handleConfirm = async () => {
			setIsLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 2000));
			setIsLoading(false);
			alert('Done!');
		};

		return (
			<>
				<Button onClick={() => setOpen(true)}>Delete with Loading</Button>
				<ConfirmationDialog
					open={open}
					onOpenChange={(v) => {
						setOpen(v);
						if (!v) setIsLoading(false);
					}}
					title="Delete Booking"
					description="Are you sure you want to delete booking #BK-2025-001?"
					variant="danger"
					confirmLabel="Delete"
					isLoading={isLoading}
					onConfirm={handleConfirm}
				/>
			</>
		);
	},
};

export const WithCustomContent: Story = {
	render: function WithCustomContentStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Cancel with Details</Button>
				<ConfirmationDialog
					open={open}
					onOpenChange={setOpen}
					title="Cancel Booking"
					description="You are about to cancel the following booking:"
					variant="warning"
					confirmLabel="Yes, Cancel"
					onConfirm={() => alert('Cancelled!')}
				>
					<div className="rounded-md bg-muted p-3 text-sm space-y-1">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Booking ID</span>
							<span className="font-medium">#BK-2025-001</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Customer</span>
							<span className="font-medium">John Doe</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Amount</span>
							<span className="font-medium">Rp 4.500.000</span>
						</div>
					</div>
				</ConfirmationDialog>
			</>
		);
	},
};

export const CustomLabels: Story = {
	render: function CustomLabelsStory() {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button onClick={() => setOpen(true)}>Custom Labels</Button>
				<ConfirmationDialog
					open={open}
					onOpenChange={setOpen}
					title="Leave Page?"
					description="You have unsaved changes. Are you sure you want to leave?"
					confirmLabel="Leave"
					cancelLabel="Stay"
					onConfirm={() => alert('Left!')}
				/>
			</>
		);
	},
};
