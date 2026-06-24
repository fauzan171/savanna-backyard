import { Link } from 'react-router-dom';
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@/react-app/components/ui/popover';
import type { CalendarMatrixResult, CalendarMatrixCell } from '../types/calendar.types';

const STATUS_STYLES: Record<CalendarMatrixCell['status'], string> = {
	available: 'bg-emerald-500/15 hover:bg-emerald-500/30',
	booked: 'bg-blue-500/70 hover:bg-blue-500',
	maintenance: 'bg-amber-500/70 hover:bg-amber-500',
	inactive: 'bg-zinc-300 dark:bg-zinc-700',
};

const STATUS_LABEL: Record<CalendarMatrixCell['status'], string> = {
	available: 'Available',
	booked: 'Booked',
	maintenance: 'Maintenance',
	inactive: 'Inactive',
};

function getDaysInMonth(month: string): number {
	const [y, m] = month.split('-').map(Number);
	return new Date(y, m, 0).getDate();
}

function todayStr(): string {
	return new Date().toISOString().split('T')[0];
}

const pad = (n: number) => String(n).padStart(2, '0');

export function CalendarMatrix({ data }: { data: CalendarMatrixResult }) {
	const days = getDaysInMonth(data.month);
	const today = todayStr();
	const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);
	const gridTemplate = `200px repeat(${days}, minmax(30px, 1fr))`;

	return (
		<div className="overflow-x-auto rounded-lg border">
			<div className="min-w-max">
				{/* Header row: vehicle column + day columns */}
				<div
					className="grid sticky top-0 z-10 bg-background border-b"
					style={{ gridTemplateColumns: gridTemplate }}
				>
					<div className="p-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-background z-20">
						Vehicle
					</div>
					{dayNumbers.map((d) => {
						const dateStr = `${data.month}-${pad(d)}`;
						const isToday = dateStr === today;
						return (
							<div
								key={d}
								className={`p-1 text-center text-[10px] ${
									isToday ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground'
								}`}
							>
								{d}
							</div>
						);
					})}
				</div>

				{/* Vehicle rows */}
				{data.vehicles.map((v) => (
					<div
						key={v.id}
						className="grid border-b last:border-b-0 hover:bg-muted/20"
						style={{ gridTemplateColumns: gridTemplate }}
					>
						<div className="p-2 sticky left-0 bg-background border-r z-10">
							<Link
								to={`/vehicles/${v.id}`}
								className="text-sm font-medium hover:underline truncate block"
							>
								{v.name}
							</Link>
							<span className="text-[10px] text-muted-foreground">{v.plateNumber}</span>
						</div>
						{dayNumbers.map((d) => {
							const dateStr = `${data.month}-${pad(d)}`;
							return <CalendarCell key={d} cell={v.dates[dateStr]} isToday={dateStr === today} />;
						})}
					</div>
				))}

				{data.vehicles.length === 0 && (
					<div className="p-8 text-center text-sm text-muted-foreground">
						No vehicles match the current filters.
					</div>
				)}
			</div>
		</div>
	);
}

function CalendarCell({ cell, isToday }: { cell?: CalendarMatrixCell; isToday: boolean }) {
	if (!cell) {
		return <div className="m-px h-7 bg-muted/20" />;
	}

	const cls = STATUS_STYLES[cell.status];
	const todayRing = isToday ? 'ring-2 ring-primary ring-offset-1' : '';

	if (cell.status === 'booked' && cell.booking) {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={`m-px h-7 w-full rounded-sm ${cls} ${todayRing} cursor-pointer`}
						title={`${cell.booking.customerName} — ${cell.booking.bookingNumber}`}
					/>
				</PopoverTrigger>
				<PopoverContent className="w-56 text-sm">
					<div className="font-medium">{cell.booking.customerName}</div>
					<div className="text-xs text-muted-foreground font-mono">{cell.booking.bookingNumber}</div>
					<div className="text-xs text-muted-foreground mt-1">{cell.booking.customerPhone}</div>
					<Link
						to={`/bookings/${cell.booking.id}`}
						className="text-xs text-primary hover:underline mt-2 inline-block"
					>
						View booking →
					</Link>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<div
			className={`m-px h-7 w-full rounded-sm ${cls} ${todayRing}`}
			title={STATUS_LABEL[cell.status]}
		/>
	);
}
