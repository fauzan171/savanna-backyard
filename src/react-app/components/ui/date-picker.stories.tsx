import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker, DateRangePicker } from './date-picker';
import { useState } from 'react';

const meta = {
	title: 'UI/DatePicker',
	component: DatePicker,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof DatePicker>;

export default meta;

export const Default: Story = {
	render: function DefaultStory() {
		const [date, setDate] = useState<Date | undefined>();
		return (
			<DatePicker
				value={date}
				onChange={setDate}
				placeholder="Select date"
				className="w-64"
			/>
		);
	},
};

export const WithDate: Story = {
	render: function WithDateStory() {
		const [date, setDate] = useState<Date | undefined>(new Date());
		return (
			<DatePicker
				value={date}
				onChange={setDate}
				className="w-64"
			/>
		);
	},
};

export const Disabled: Story = {
	render: () => (
		<DatePicker
			disabled
			placeholder="Disabled"
			className="w-64"
		/>
	),
};

export const WithError: Story = {
	render: function WithErrorStory() {
		const [date, setDate] = useState<Date | undefined>();
		return (
			<DatePicker
				value={date}
				onChange={setDate}
				error
				placeholder="Select date"
				className="w-64"
			/>
		);
	},
};

export const WithMinMaxDate: Story = {
	render: function WithMinMaxDateStory() {
		const [date, setDate] = useState<Date | undefined>();
		const today = new Date();
		const minDate = new Date(today);
		minDate.setDate(today.getDate() - 7);
		const maxDate = new Date(today);
		maxDate.setDate(today.getDate() + 30);

		return (
			<DatePicker
				value={date}
				onChange={setDate}
				minDate={minDate}
				maxDate={maxDate}
				placeholder="Select date (7 days range)"
				className="w-64"
			/>
		);
	},
};

export const DateRange: Story = {
	render: function DateRangeStory() {
		const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
			from: undefined,
			to: undefined,
		});
		return (
			<DateRangePicker
				value={range}
				onChange={setRange}
				placeholder="Select date range"
				className="w-72"
			/>
		);
	},
};

export const DateRangeWithDates: Story = {
	render: function DateRangeWithDatesStory() {
		const today = new Date();
		const from = new Date(today);
		from.setDate(today.getDate() + 5);
		const to = new Date(today);
		to.setDate(today.getDate() + 10);

		const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
			from,
			to,
		});
		return (
			<DateRangePicker
				value={range}
				onChange={setRange}
				className="w-72"
			/>
		);
	},
};
