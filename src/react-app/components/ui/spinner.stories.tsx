import type { Meta, StoryObj } from '@storybook/react';
import { Spinner, LoadingOverlay } from './spinner';
import { useState } from 'react';
import { Button } from './button';

const meta = {
	title: 'UI/Spinner',
	component: Spinner,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
	},
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		size: 'md',
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
	},
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-8">
			<div className="flex flex-col items-center gap-2">
				<Spinner size="sm" />
				<span className="text-xs text-muted-foreground">Small</span>
			</div>
			<div className="flex flex-col items-center gap-2">
				<Spinner size="md" />
				<span className="text-xs text-muted-foreground">Medium</span>
			</div>
			<div className="flex flex-col items-center gap-2">
				<Spinner size="lg" />
				<span className="text-xs text-muted-foreground">Large</span>
			</div>
		</div>
	),
};

export const WithButton: Story = {
	render: () => (
		<Button disabled>
			<Spinner size="sm" />
			Loading...
		</Button>
	),
};

export const LoadingOverlayDemo: Story = {
	render: function LoadingOverlayDemo() {
		const [showOverlay, setShowOverlay] = useState(false);

		return (
			<div className="relative">
				<Button onClick={() => setShowOverlay(true)}>
					Show Loading Overlay
				</Button>
				<LoadingOverlay visible={showOverlay} label="Loading data..." />
				{showOverlay && (
					<div className="mt-4">
						<Button variant="outline" onClick={() => setShowOverlay(false)}>
							Hide Overlay
						</Button>
					</div>
				)}
			</div>
		);
	},
};
