import type { Meta, StoryObj } from '@storybook/react';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from './select';

const meta = {
	title: 'UI/Select',
	component: Select,
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
} satisfies Meta<typeof Select>;

export default meta;

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Select an option" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="option1">Option 1</SelectItem>
				<SelectItem value="option2">Option 2</SelectItem>
				<SelectItem value="option3">Option 3</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithGroups: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Fruits</SelectLabel>
					<SelectItem value="apple">Apple</SelectItem>
					<SelectItem value="banana">Banana</SelectItem>
					<SelectItem value="orange">Orange</SelectItem>
				</SelectGroup>
				<SelectGroup>
					<SelectLabel>Vegetables</SelectLabel>
					<SelectItem value="carrot">Carrot</SelectItem>
					<SelectItem value="broccoli">Broccoli</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Small: Story = {
	render: () => (
		<Select>
			<SelectTrigger size="sm" className="w-48">
				<SelectValue placeholder="Small select" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="1">Option 1</SelectItem>
				<SelectItem value="2">Option 2</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Large: Story = {
	render: () => (
		<Select>
			<SelectTrigger size="lg" className="w-48">
				<SelectValue placeholder="Large select" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="1">Option 1</SelectItem>
				<SelectItem value="2">Option 2</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithError: Story = {
	render: () => (
		<Select>
			<SelectTrigger error className="w-48">
				<SelectValue placeholder="Select an option" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="1">Option 1</SelectItem>
				<SelectItem value="2">Option 2</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Disabled" />
			</SelectTrigger>
		</Select>
	),
};

export const WithDisabledItem: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-48">
				<SelectValue placeholder="Select..." />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="1">Option 1</SelectItem>
				<SelectItem value="2" disabled>Disabled Option</SelectItem>
				<SelectItem value="3">Option 3</SelectItem>
			</SelectContent>
		</Select>
	),
};
