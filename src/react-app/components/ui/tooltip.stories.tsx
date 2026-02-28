import type { Meta, StoryObj } from '@storybook/react';
import { SimpleTooltip, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './tooltip';
import { Button } from './button';
import { Info } from 'lucide-react';

const meta = {
	title: 'UI/Tooltip',
	component: SimpleTooltip,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		side: {
			control: 'select',
			options: ['top', 'right', 'bottom', 'left'],
		},
	},
} satisfies Meta<typeof SimpleTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		content: 'This is a tooltip',
		children: <Button>Hover me</Button>,
	},
};

export const Top: Story = {
	args: {
		content: 'Tooltip on top',
		side: 'top',
		children: <Button>Top</Button>,
	},
};

export const Right: Story = {
	args: {
		content: 'Tooltip on right',
		side: 'right',
		children: <Button>Right</Button>,
	},
};

export const Bottom: Story = {
	args: {
		content: 'Tooltip on bottom',
		side: 'bottom',
		children: <Button>Bottom</Button>,
	},
};

export const Left: Story = {
	args: {
		content: 'Tooltip on left',
		side: 'left',
		children: <Button>Left</Button>,
	},
};

export const WithIcon: Story = {
	args: {
		content: 'Additional information about this field',
		children: (
			<button className="text-muted-foreground hover:text-foreground transition-colors">
				<Info className="size-4" />
			</button>
		),
	},
};

export const AllPositions: Story = {
	render: () => (
		<div className="flex gap-8">
			<SimpleTooltip content="Top tooltip" side="top">
				<Button>Top</Button>
			</SimpleTooltip>
			<SimpleTooltip content="Right tooltip" side="right">
				<Button>Right</Button>
			</SimpleTooltip>
			<SimpleTooltip content="Bottom tooltip" side="bottom">
				<Button>Bottom</Button>
			</SimpleTooltip>
			<SimpleTooltip content="Left tooltip" side="left">
				<Button>Left</Button>
			</SimpleTooltip>
		</div>
	),
};

export const LongContent: Story = {
	args: {
		content: 'This is a longer tooltip that contains more information about the element.',
		children: <Button>Long tooltip</Button>,
	},
};

export const Delayed: Story = {
	args: {
		content: 'This tooltip appears after 500ms',
		delayDuration: 500,
		children: <Button>Delayed tooltip</Button>,
	},
};
