import type { Meta, StoryObj } from '@storybook/react';
import { Toaster } from './sonner';
import { useToast } from '@/react-app/hooks/useToast';
import { Button } from './button';

const meta = {
	title: 'UI/Toast',
	component: Toaster,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;

function ToastDemo({ variant = 'default', title, description }: { variant?: 'default' | 'destructive'; title: string; description?: string }) {
	const { toast } = useToast();

	return (
		<div className="space-y-4">
			<Button
				onClick={() =>
					toast({
						title,
						description,
						variant,
					})
				}
			>
				Show Toast
			</Button>
			<Toaster />
		</div>
	);
}

export const Default: Story = {
	render: () => (
		<ToastDemo
			title="Booking Created"
			description="Your booking has been successfully created."
		/>
	),
};

export const Destructive: Story = {
	render: () => (
		<ToastDemo
			variant="destructive"
			title="Error"
			description="Failed to create booking. Please try again."
		/>
	),
};

export const NoDescription: Story = {
	render: () => (
		<ToastDemo title="Changes saved" />
	),
};

export const MultipleToasts: Story = {
	render: function MultipleToastsStory() {
		const { toast } = useToast();

		return (
			<div className="space-y-4">
				<div className="flex gap-2">
					<Button
						onClick={() =>
							toast({
								title: 'Success',
								description: 'Operation completed successfully.',
							})
						}
					>
						Success Toast
					</Button>
					<Button
						variant="destructive"
						onClick={() =>
							toast({
								title: 'Error',
								description: 'Something went wrong.',
								variant: 'destructive',
							})
						}
					>
						Error Toast
					</Button>
					<Button
						variant="outline"
						onClick={() =>
							toast({
								title: 'Info',
								description: 'Just a notification.',
							})
						}
					>
						Info Toast
					</Button>
				</div>
				<Toaster />
			</div>
		);
	},
};
