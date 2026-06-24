import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/react-app/components/ui/select';
import { Spinner } from '@/react-app/components/ui/spinner';
import { MonthCalendar } from '../components/MonthCalendar';
import { useCalendarMatrix } from '../hooks/useCalendarMatrix';

function currentMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(y, m - 1 + delta, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function CalendarPage() {
	const [month, setMonth] = useState(currentMonth());
	const [type, setType] = useState<string | undefined>(undefined);
	const [status, setStatus] = useState<string | undefined>(undefined);

	const { data, isLoading, error } = useCalendarMatrix({ month, type, status });
	const isCurrentMonth = month === currentMonth();

	return (
		<div className="flex flex-col overflow-hidden -mx-6 -mt-6 -mb-6" style={{ height: 'calc(100vh - 4rem)' }}>
			{/* Top toolbar — compact, Google Calendar-like */}
			<div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-3 shrink-0">
				{/* Logo / title */}
				<div className="flex items-center gap-2 mr-2">
					<Calendar className="size-5 text-primary" />
					<span className="text-lg font-semibold tracking-tight">Fleet Calendar</span>
				</div>

				{/* Today button */}
				<Button
					variant="outline"
					size="sm"
					onClick={() => setMonth(currentMonth())}
					disabled={isCurrentMonth}
					className="shrink-0"
				>
					Today
				</Button>

				{/* Month navigation */}
				<div className="flex items-center gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => setMonth(shiftMonth(month, -1))}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => setMonth(shiftMonth(month, 1))}
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				{/* Month label */}
				<h2 className="text-xl font-semibold min-w-[200px]">
					{formatMonthLabel(month)}
				</h2>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Filters */}
				<Select value={type ?? 'all'} onValueChange={(v) => setType(v === 'all' ? undefined : v)}>
					<SelectTrigger className="h-8 w-[140px] text-xs">
						<SelectValue placeholder="All types" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All types</SelectItem>
						<SelectItem value="TrailBike">Trail Bike</SelectItem>
						<SelectItem value="StreetBike">Street Bike</SelectItem>
						<SelectItem value="Car">Car</SelectItem>
						<SelectItem value="Jeep">Jeep</SelectItem>
						<SelectItem value="Other">Other</SelectItem>
					</SelectContent>
				</Select>

				<Select value={status ?? 'all'} onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}>
					<SelectTrigger className="h-8 w-[150px] text-xs">
						<SelectValue placeholder="All statuses" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="Available">Available</SelectItem>
						<SelectItem value="Rented">Rented</SelectItem>
						<SelectItem value="Maintenance">Maintenance</SelectItem>
						<SelectItem value="Inactive">Inactive</SelectItem>
					</SelectContent>
				</Select>

				{/* Legend */}
				<div className="hidden lg:flex items-center gap-3 border-l pl-3 text-xs">
					<LegendDot color="bg-blue-600" label="Trail Bike" />
					<LegendDot color="bg-emerald-600" label="Street Bike" />
					<LegendDot color="bg-violet-600" label="Car" />
					<LegendDot color="bg-amber-600" label="Jeep" />
					<LegendDot color="bg-amber-100 border border-amber-300 dark:bg-amber-500/20" label="Maint." textClass="text-amber-700 dark:text-amber-400" />
				</div>
			</div>

			{/* Calendar body — fills remaining height */}
			<div className="flex-1 overflow-auto px-4 py-4">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<div className="flex flex-col items-center gap-3 text-muted-foreground">
							<Spinner size="lg" />
							<span className="text-sm">Loading calendar…</span>
						</div>
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center">
						<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
							<p className="font-medium">Failed to load calendar</p>
							<p className="mt-1 text-sm opacity-80">Please refresh the page or try again.</p>
						</div>
					</div>
				) : data ? (
					<div className="h-full min-h-[640px]">
						<MonthCalendar data={data} />
					</div>
				) : null}
			</div>
		</div>
	);
}

function LegendDot({
	color,
	label,
	textClass,
}: {
	color: string;
	label: string;
	textClass?: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className={`inline-block size-2.5 rounded-full ${color}`} />
			<span className={textClass ?? 'text-muted-foreground'}>{label}</span>
		</div>
	);
}
