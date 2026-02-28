import type { Meta, StoryObj } from '@storybook/react';
import { FormField, FormGroup } from './form-field';
import { Input } from './input';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Button } from './button';

const meta = {
	title: 'UI/FormField',
	component: FormField,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<FormField label="Email Address" className="w-64">
			<Input placeholder="Enter your email" />
		</FormField>
	),
};

export const Required: Story = {
	render: () => (
		<FormField label="Email Address" required className="w-64">
			<Input placeholder="Enter your email" />
		</FormField>
	),
};

export const WithError: Story = {
	render: () => (
		<FormField
			label="Email Address"
			error="Please enter a valid email address"
			className="w-64"
		>
			<Input placeholder="Enter your email" defaultValue="invalid" />
		</FormField>
	),
};

export const WithHint: Story = {
	render: () => (
		<FormField
			label="Username"
			hint="Must be at least 3 characters"
			className="w-64"
		>
			<Input placeholder="Enter username" />
		</FormField>
	),
};

export const WithTextarea: Story = {
	render: () => (
		<FormField label="Message" hint="Maximum 500 characters" className="w-64">
			<Textarea placeholder="Enter your message" />
		</FormField>
	),
};

export const WithSelect: Story = {
	render: () => (
		<FormField label="Country" className="w-64">
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Select country" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="id">Indonesia</SelectItem>
					<SelectItem value="my">Malaysia</SelectItem>
					<SelectItem value="sg">Singapore</SelectItem>
				</SelectContent>
			</Select>
		</FormField>
	),
};

export const RenderFunction: Story = {
	render: () => (
		<FormField label="Custom Input" className="w-64">
			{({ id }) => (
				<Input id={id} placeholder="Using render function" />
			)}
		</FormField>
	),
};

export const CompleteForm: Story = {
	render: () => (
		<FormGroup className="w-80">
			<FormField label="Full Name" required>
				<Input placeholder="Enter your name" />
			</FormField>
			<FormField label="Email" required>
				<Input type="email" placeholder="Enter your email" />
			</FormField>
			<FormField label="Phone" hint="Include country code">
				<Input type="tel" placeholder="+62 xxx xxx xxx" />
			</FormField>
			<FormField label="Message">
				<Textarea placeholder="Enter your message" size="sm" />
			</FormField>
			<Button className="w-full">Submit</Button>
		</FormGroup>
	),
};
