import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem, RadioOption } from './radio-group';
import { Label } from './label';

const meta = {
	title: 'UI/RadioGroup',
	component: RadioGroup,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;

export const Default: Story = {
	render: () => (
		<RadioGroup defaultValue="option1">
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option1" id="r1" />
				<Label htmlFor="r1">Option 1</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option2" id="r2" />
				<Label htmlFor="r2">Option 2</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option3" id="r3" />
				<Label htmlFor="r3">Option 3</Label>
			</div>
		</RadioGroup>
	),
};

export const Horizontal: Story = {
	render: () => (
		<RadioGroup defaultValue="option1" orientation="horizontal">
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option1" id="h1" />
				<Label htmlFor="h1">Option 1</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option2" id="h2" />
				<Label htmlFor="h2">Option 2</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option3" id="h3" />
				<Label htmlFor="h3">Option 3</Label>
			</div>
		</RadioGroup>
	),
};

export const Disabled: Story = {
	render: () => (
		<RadioGroup>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option1" id="d1" />
				<Label htmlFor="d1">Option 1</Label>
			</div>
			<div className="flex items-center gap-2">
				<RadioGroupItem value="option2" id="d2" disabled />
				<Label htmlFor="d2">Disabled Option</Label>
			</div>
		</RadioGroup>
	),
};

export const WithRadioOptions: Story = {
	render: () => (
		<RadioGroup defaultValue="standard" className="space-y-2 w-64">
			<RadioOption
				value="standard"
				label="Standard Delivery"
				description="3-5 business days"
			/>
			<RadioOption
				value="express"
				label="Express Delivery"
				description="1-2 business days"
			/>
			<RadioOption
				value="overnight"
				label="Overnight Delivery"
				description="Next business day"
			/>
		</RadioGroup>
	),
};

export const PaymentMethod: Story = {
	render: () => (
		<RadioGroup defaultValue="bank" className="space-y-2 w-72">
			<RadioOption
				value="bank"
				label="Bank Transfer"
				description="Transfer via BCA, Mandiri, or BNI"
			/>
			<RadioOption
				value="ewallet"
				label="E-Wallet"
				description="Pay with GoPay, OVO, or DANA"
			/>
			<RadioOption
				value="cash"
				label="Cash on Delivery"
				description="Pay when you receive your order"
			/>
		</RadioGroup>
	),
};
