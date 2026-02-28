import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar is a standalone date picker component.
 * Supports single date, range, and multiple date selection.
 */
function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn('p-3', className)}
			classNames={{
				months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
				month: 'space-y-4',
				caption: 'flex justify-center pt-1 relative items-center',
				caption_label: 'text-sm font-medium',
				nav: 'space-x-1 flex items-center',
				nav_button: cn(
					'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
					'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors',
					'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
				),
				nav_button_previous: 'absolute left-1',
				nav_button_next: 'absolute right-1',
				table: 'w-full border-collapse space-y-1',
				head_row: 'flex',
				head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
				row: 'flex w-full mt-2',
				cell: cn(
					'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
					'[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
				),
				day: cn(
					'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
					'inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors',
					'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
				),
				day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
				day_today: 'bg-accent text-accent-foreground',
				day_outside: 'text-muted-foreground opacity-50',
				day_disabled: 'text-muted-foreground opacity-50',
				day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
				day_hidden: 'invisible',
				...classNames,
			}}
			components={{
				Chevron: ({ orientation }) =>
					orientation === 'left' ? (
						<ChevronLeft className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					),
			}}
			{...props}
		/>
	);
}
Calendar.displayName = 'Calendar';

// ============================================
// CALENDAR WITH EVENTS
// ============================================

export interface CalendarEvent {
	date: Date;
	label?: string;
	color?: string;
}

export interface CalendarWithEventsProps extends Omit<CalendarProps, 'modifiers' | 'modifiersStyles' | 'mode' | 'selected' | 'onSelect'> {
	/** Events to display on the calendar */
	events?: CalendarEvent[];
	/** Callback when a date is clicked */
	onDateClick?: (date: Date) => void;
	/** Callback when an event is clicked */
	onEventClick?: (event: CalendarEvent) => void;
}

function CalendarWithEvents({
	events = [],
	onDateClick,
	onEventClick,
	...props
}: CalendarWithEventsProps) {
	const [selected, setSelected] = React.useState<Date | undefined>(undefined);

	// Group events by date string for quick lookup
	const eventsByDate = React.useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		events.forEach(event => {
			const dateStr = event.date.toDateString();
			const existing = map.get(dateStr) || [];
			map.set(dateStr, [...existing, event]);
		});
		return map;
	}, [events]);

	const modifiers = React.useMemo(() => {
		return {
			hasEvent: events.map(e => e.date),
		};
	}, [events]);

	const modifiersStyles = React.useMemo(() => {
		return {
			hasEvent: {
				position: 'relative' as const,
			},
		};
	}, []);

	const handleSelect = (date: Date | undefined) => {
		setSelected(date);
		if (date) {
			onDateClick?.(date);
			const dateEvents = eventsByDate.get(date.toDateString());
			if (dateEvents?.length === 1) {
				onEventClick?.(dateEvents[0]);
			}
		}
	};

	return (
		<div className="relative">
			<Calendar
				mode="single"
				selected={selected}
				onSelect={handleSelect}
				modifiers={modifiers}
				modifiersStyles={modifiersStyles}
				{...props}
			/>
			{/* Event indicators rendered via CSS ::after pseudo-element would require custom styling */}
		</div>
	);
}

export { Calendar, CalendarWithEvents };
