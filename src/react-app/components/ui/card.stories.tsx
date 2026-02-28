import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardActions } from './card';
import { Button } from './button';

const meta = {
	title: 'UI/Card',
	component: Card,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		variant: {
			control: 'select',
			options: ['default', 'outlined', 'elevated', 'ghost'],
		},
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card description goes here</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">
					This is the card content. You can put any content here.
				</p>
			</CardContent>
		</Card>
	),
};

export const Outlined: Story = {
	render: () => (
		<Card variant="outlined" className="w-80">
			<CardHeader>
				<CardTitle>Outlined Card</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm">This card has a stronger border.</p>
			</CardContent>
		</Card>
	),
};

export const Elevated: Story = {
	render: () => (
		<Card variant="elevated" className="w-80">
			<CardHeader>
				<CardTitle>Elevated Card</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm">This card has a stronger shadow.</p>
			</CardContent>
		</Card>
	),
};

export const Ghost: Story = {
	render: () => (
		<Card variant="ghost" className="w-80">
			<CardHeader>
				<CardTitle>Ghost Card</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm">This card has no background or border.</p>
			</CardContent>
		</Card>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Card className="w-80">
			<CardHeader>
				<CardTitle>Card with Footer</CardTitle>
				<CardDescription>Actions can be placed in the footer</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-sm">Some content here.</p>
			</CardContent>
			<CardFooter>
				<CardActions>
					<Button variant="outline" size="sm">Cancel</Button>
					<Button size="sm">Save</Button>
				</CardActions>
			</CardFooter>
		</Card>
	),
};

export const DashboardCard: Story = {
	render: () => (
		<Card className="w-64">
			<CardContent className="pt-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground">Total Revenue</p>
						<p className="text-2xl font-bold font-display">Rp 45.000.000</p>
						<p className="text-xs text-success mt-1">+12% from last month</p>
					</div>
					<div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
						<span className="text-primary text-xl">💰</span>
					</div>
				</div>
			</CardContent>
		</Card>
	),
};
