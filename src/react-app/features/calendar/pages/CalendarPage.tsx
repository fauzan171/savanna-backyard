import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/react-app/components/layout';
import { Button } from '@/react-app/components/ui/button';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/react-app/components/ui/select';
import { Spinner } from '@/react-app/components/ui/spinner';
import { CalendarMatrix } from '../components/CalendarMatrix';
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
	return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function CalendarPage() {
	const [month, setMonth] = useState(currentMonth());
	const [type, setType] = useState<string | undefined>(undefined);
	const [status, setStatus] = useState<string | undefined>(undefined);

	const { data, isLoading, error } = useCalendarMatrix({ month, type, status });

	return (
		<div className="space-y-6">
			<PageHeader
				title="Fleet Calendar"
				description="Vehicle availability matrix — every vehicle across every day of the month."
			/>

			{/* Controls */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex items-center gap-1">
					<Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, -1))}>
						<ChevronLeft className="size-4" />
					</Button>
					<div className="min-w-[160px] text-center font-medium">{formatMonthLabel(month)}</div>
					<Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, 1))}>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				<Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth())}>
					Today
				</Button>

				<Select value={type ?? 'all'} onValueChange={(v) => setType(v === 'all' ? undefined : v)}>
					<SelectTrigger className="w-[150px]">
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
					<SelectTrigger className="w-[160px]">
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
				<div className="flex flex-wrap items-center gap-3 ml-auto text-xs">
					<Legend className="bg-emerald-500/40" label="Available" />
					<Legend className="bg-blue-500/70" label="Booked" />
					<Legend className="bg-amber-500/70" label="Maintenance" />
					<Legend className="bg-zinc-300" label="Inactive" />
				</div>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-16">
					<Spinner size="lg" />
				</div>
			) : error ? (
				<div className="rounded-lg border border-error/50 bg-error/10 p-6 text-center text-error">
					Failed to load calendar. Please try again.
				</div>
			) : data ? (
				<CalendarMatrix data={data} />
			) : null}
		</div>
	);
}

function Legend({ className, label }: { className: string; label: string }) {
	return (
		<div className="flex items-center gap-1.5">
			<span className={`size-3 rounded-sm ${className}`} />
			<span className="text-muted-foreground">{label}</span>
		</div>
	);
}
