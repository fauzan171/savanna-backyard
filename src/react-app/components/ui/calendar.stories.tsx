import type { Meta, StoryObj } from '@storybook/react';
import { Calendar, CalendarWithEvents, type CalendarEvent } from './calendar';
import { addDays } from 'date-fns';

const meta = {
	title: 'UI/Calendar',
	component: Calendar,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;

export const Default: Story = {
	render: () => <Calendar />,
};

export const WithSelectedDate: Story = {
	render: () => <Calendar mode="single" selected={new Date()} />,
};

export const DateRange: Story = {
	render: () => {
		const today = new Date();
		return (
			<Calendar
				mode="range"
				selected={{
					from: today,
					to: addDays(today, 7),
				}}
			/>
		);
	},
};

export const MultipleMonths: Story = {
	render: () => <Calendar numberOfMonths={2} />,
};

export const WithDisabledDates: Story = {
	render: () => {
		const today = new Date();
		const disabledDays = [
			addDays(today, 1),
			addDays(today, 2),
			addDays(today, 3),
		];

		return (
			<Calendar
				mode="single"
				disabled={disabledDays}
			/>
		);
	},
};

export const WithMinMaxDate: Story = {
	render: () => {
		const today = new Date();
		const minDate = today;
		const maxDate = addDays(today, 30);

		return (
			<Calendar
				mode="single"
				disabled={[{ before: minDate }, { after: maxDate }]}
			/>
		);
	},
};

export const WithEvents: Story = {
	render: function WithEventsStory() {
		const today = new Date();
		const events: CalendarEvent[] = [
			{ date: addDays(today, 2), label: 'Booking 1', color: 'blue' },
			{ date: addDays(today, 5), label: 'Booking 2', color: 'green' },
			{ date: addDays(today, 7), label: 'Booking 3', color: 'orange' },
		];

		return (
			<CalendarWithEvents
				events={events}
				onDateClick={(date) => console.log('Date clicked:', date)}
				onEventClick={(event) => console.log('Event clicked:', event)}
			/>
		);
	},
};

export const HideOutsideDays: Story = {
	render: () => <Calendar showOutsideDays={false} />,
};

export const WeekStartsOnMonday: Story = {
	render: () => <Calendar weekStartsOn={1} />,
};
