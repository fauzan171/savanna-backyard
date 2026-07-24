import { format, subDays, subMonths, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Calendar } from '@/react-app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/react-app/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';
import { cn } from '@/react-app/lib/utils';

interface DateRangeFilterProps {
	startDate?: Date;
	endDate?: Date;
	onStartDateChange: (date?: Date) => void;
	onEndDateChange: (date?: Date) => void;
	preset?: string;
	onPresetChange?: (preset: string) => void;
}

const presets = [
	{ value: 'today', label: 'Today', getRange: () => ({ start: new Date(), end: new Date() }) },
	{
		value: 'week',
		label: 'This Week',
		getRange: () => ({ start: subWeeks(new Date(), 1), end: new Date() }),
	},
	{
		value: 'month',
		label: 'This Month',
		getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
	},
	{
		value: 'last30',
		label: 'Last 30 Days',
		getRange: () => ({ start: subDays(new Date(), 30), end: new Date() }),
	},
	{
		value: 'last90',
		label: 'Last 90 Days',
		getRange: () => ({ start: subDays(new Date(), 90), end: new Date() }),
	},
	{
		value: 'year',
		label: 'This Year',
		getRange: () => ({ start: subMonths(new Date(), 12), end: new Date() }),
	},
];

export function DateRangeFilter({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	preset,
	onPresetChange,
}: DateRangeFilterProps) {
	const handlePresetChange = (value: string) => {
		const selected = presets.find((p) => p.value === value);
		if (selected) {
			const range = selected.getRange();
			onStartDateChange(range.start);
			onEndDateChange(range.end);
			onPresetChange?.(value);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<Select value={preset} onValueChange={handlePresetChange}>
				<SelectTrigger className="w-[140px]">
					<SelectValue placeholder="Select period" />
				</SelectTrigger>
				<SelectContent>
					{presets.map((p) => (
						<SelectItem key={p.value} value={p.value}>
							{p.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
							className={cn(
								'w-[150px] justify-start text-left font-normal',
								!startDate && 'text-muted-foreground'
							)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{startDate ? format(startDate, 'MMM d, yyyy') : 'Start date'}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={startDate}
						onSelect={onStartDateChange}
						initialFocus
					/>
				</PopoverContent>
			</Popover>

			<span className="text-muted-foreground">to</span>

			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
							className={cn(
								'w-[150px] justify-start text-left font-normal',
								!endDate && 'text-muted-foreground'
							)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{endDate ? format(endDate, 'MMM d, yyyy') : 'End date'}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={endDate}
						onSelect={onEndDateChange}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
