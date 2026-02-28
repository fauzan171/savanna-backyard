import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { DayPicker, type Matcher } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/react-app/components/ui/popover';

export type DatePickerProps = {
	/** Selected date */
	value?: Date;
	/** Callback when date changes */
	onChange?: (date: Date | undefined) => void;
	/** Placeholder text */
	placeholder?: string;
	/** Date format for display */
	format?: string;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Disable the picker */
	disabled?: boolean;
	/** Show error state */
	error?: boolean;
	/** Additional class name */
	className?: string;
	/** Custom trigger element */
	trigger?: React.ReactNode;
	/** Allow manual input */
	allowManualInput?: boolean;
};

function DatePicker({
	value,
	onChange,
	placeholder = 'Pilih tanggal',
	format: formatStr = 'dd MMM yyyy',
	minDate,
	maxDate,
	disabled,
	error,
	className,
	trigger,
	allowManualInput = true,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);
	const [inputValue, setInputValue] = React.useState(
		value && isValid(value) ? format(value, formatStr, { locale: localeId }) : ''
	);

	// Sync input value with value prop
	React.useEffect(() => {
		if (value && isValid(value)) {
			setInputValue(format(value, formatStr, { locale: localeId }));
		} else if (!value) {
			setInputValue('');
		}
	}, [value, formatStr]);

	const handleSelect = (date: Date | undefined) => {
		onChange?.(date);
		setOpen(false);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newInputValue = e.target.value;
		setInputValue(newInputValue);

		if (!allowManualInput) return;

		// Try to parse the date
		const parsedDate = parse(newInputValue, formatStr, new Date(), { locale: localeId });
		if (isValid(parsedDate)) {
			// Check min/max constraints
			if (minDate && parsedDate < minDate) return;
			if (maxDate && parsedDate > maxDate) return;
			onChange?.(parsedDate);
		} else if (newInputValue === '') {
			onChange?.(undefined);
		}
	};

	const disabledDays: Matcher[] = [];
	if (minDate) disabledDays.push({ before: minDate });
	if (maxDate) disabledDays.push({ after: maxDate });

	const defaultTrigger = allowManualInput ? (
		<Input
			value={inputValue}
			onChange={handleInputChange}
			placeholder={placeholder}
			disabled={disabled}
			error={error ? ' ' : undefined}
			rightIcon={<CalendarIcon className="size-4 opacity-50" />}
			className={cn('cursor-pointer', className)}
			onClick={() => !disabled && setOpen(true)}
			readOnly={!allowManualInput}
		/>
	) : (
		<Button
			variant="outline"
			className={cn(
				'w-full justify-start text-left font-normal',
				!value && 'text-muted-foreground',
				error && 'border-destructive',
				className
			)}
			disabled={disabled}
		>
			<CalendarIcon className="mr-2 size-4" />
			{value && isValid(value) ? format(value, formatStr, { locale: localeId }) : placeholder}
		</Button>
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				{trigger || defaultTrigger}
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<DayPicker
					mode="single"
					selected={value}
					onSelect={handleSelect}
					locale={localeId}
					disabled={disabledDays}
					initialFocus
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
						day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
						day_today: 'bg-accent text-accent-foreground',
						day_outside: 'text-muted-foreground opacity-50',
						day_disabled: 'text-muted-foreground opacity-50',
						day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
						day_hidden: 'invisible',
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

// ============================================
// DATE RANGE PICKER
// ============================================

export type DateRangePickerProps = {
	/** Selected date range */
	value?: { from: Date | undefined; to: Date | undefined };
	/** Callback when date range changes */
	onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
	/** Placeholder text */
	placeholder?: string;
	/** Date format for display */
	format?: string;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Disable the picker */
	disabled?: boolean;
	/** Show error state */
	error?: boolean;
	/** Additional class name */
	className?: string;
};

function DateRangePicker({
	value,
	onChange,
	placeholder = 'Pilih rentang tanggal',
	format: formatStr = 'dd MMM yyyy',
	minDate,
	maxDate,
	disabled,
	error,
	className,
}: DateRangePickerProps) {
	const [open, setOpen] = React.useState(false);

	const formatRange = () => {
		if (!value?.from) return placeholder;
		const fromStr = format(value.from, formatStr, { locale: localeId });
		if (!value.to) return fromStr;
		const toStr = format(value.to, formatStr, { locale: localeId });
		return `${fromStr} - ${toStr}`;
	};

	const disabledDays: Matcher[] = [];
	if (minDate) disabledDays.push({ before: minDate });
	if (maxDate) disabledDays.push({ after: maxDate });

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild disabled={disabled}>
				<Button
					variant="outline"
					className={cn(
						'w-full justify-start text-left font-normal',
						!value?.from && 'text-muted-foreground',
						error && 'border-destructive',
						className
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 size-4" />
					{formatRange()}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<DayPicker
					mode="range"
					selected={value}
					onSelect={(range) => {
						onChange?.({
							from: range?.from,
							to: range?.to,
						});
					}}
					numberOfMonths={2}
					locale={localeId}
					disabled={disabledDays}
					initialFocus
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
						day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
						day_today: 'bg-accent text-accent-foreground',
						day_outside: 'text-muted-foreground opacity-50',
						day_disabled: 'text-muted-foreground opacity-50',
						day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
						day_hidden: 'invisible',
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

export { DatePicker, DateRangePicker };
