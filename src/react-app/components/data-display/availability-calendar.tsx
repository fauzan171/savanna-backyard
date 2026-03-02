import * as React from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type Matcher, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/react-app/lib/utils';

export interface BookingBlock {
	id: string;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	status?: 'confirmed' | 'pending' | 'active';
	label?: string;
	bookingNumber?: string;
}

export interface AvailabilityCalendarProps {
	/** Existing bookings/blocks */
	bookings: BookingBlock[];
	/** Currently selected range */
	value?: { from: Date | undefined; to: Date | undefined };
	/** Selection change handler */
	onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Number of months to display */
	numberOfMonths?: number;
	/** Show legend */
	showLegend?: boolean;
	/** Additional class name */
	className?: string;
}

export function AvailabilityCalendar({
	bookings,
	value,
	onChange,
	minDate,
	maxDate,
	numberOfMonths = 2,
	showLegend = true,
	className,
}: AvailabilityCalendarProps) {
	// Convert bookings to blocked date ranges
	const blockedRanges = React.useMemo(() => {
		return bookings.map((booking) => ({
			from: parseISO(booking.startDate),
			to: parseISO(booking.endDate),
			booking,
		}));
	}, [bookings]);

	// Get all blocked dates as individual days
	const blockedDays = React.useMemo(() => {
		const days: Date[] = [];
		blockedRanges.forEach((range) => {
			let current = range.from;
			while (current <= range.to) {
				days.push(new Date(current));
				current = new Date(current.getTime() + 86400000); // Add 1 day
			}
		});
		return days;
	}, [blockedRanges]);

	// Disabled days matcher
	const disabledDays: Matcher[] = [...blockedDays];
	if (minDate) disabledDays.push({ before: minDate });
	if (maxDate) disabledDays.push({ after: maxDate });

	// Calculate number of days selected
	const selectedDays = React.useMemo(() => {
		if (value?.from && value?.to) {
			return differenceInDays(value.to, value.from) + 1;
		}
		return 0;
	}, [value]);

	return (
		<div className={cn('space-y-4', className)}>
			{/* Selected Range Info */}
			{selectedDays > 0 && (
				<div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg text-sm">
					<span className="text-muted-foreground">Selected Duration</span>
					<span className="font-semibold">
						{selectedDays} {selectedDays === 1 ? 'day' : 'days'}
					</span>
				</div>
			)}

			{/* Calendar */}
			<DayPicker
				mode="range"
				selected={value as DateRange | undefined}
				onSelect={(range: DateRange | undefined) => {
					onChange?.({
						from: range?.from,
						to: range?.to,
					});
				}}
				numberOfMonths={numberOfMonths}
				locale={localeId}
				disabled={disabledDays}
				showOutsideDays
				fixedWeeks
				components={{
					Chevron: ({ orientation }) =>
						orientation === 'left' ? (
							<ChevronLeft className="size-4" />
						) : (
							<ChevronRight className="size-4" />
						),
				}}
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
					day_selected:
						'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
					day_today: 'bg-accent text-accent-foreground',
					day_outside: 'text-muted-foreground opacity-50',
					day_disabled: 'text-muted-foreground opacity-50 cursor-not-allowed line-through',
					day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
					day_hidden: 'invisible',
				}}
			/>

			{/* Legend */}
			{showLegend && (
				<div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<div className="size-3 rounded border" />
						<span>Available</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="size-3 rounded bg-primary" />
						<span>Selected</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="size-3 rounded bg-muted-foreground/30 relative">
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="w-full h-px bg-muted-foreground/50" />
							</div>
						</div>
						<span>Booked</span>
					</div>
				</div>
			)}
		</div>
	);
}
