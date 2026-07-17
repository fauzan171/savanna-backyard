import { Link } from 'react-router-dom';
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@/react-app/components/ui/popover';
import { Wrench } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import type { CalendarMatrixResult, VehicleType } from '../types/calendar.types';

// Layout constants (px)
const DATE_HEADER_H = 32; // date number row height per cell
const LANE_H = 22;        // each event bar height
const MAX_LANES = 4;      // max visible bars before "+N more"

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => fmt(new Date());

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Google Calendar-like color palette per vehicle type
const TYPE_COLORS: Record<string, { bar: string; text: string; dot: string; pill: string }> = {
	TrailBike:  { bar: 'bg-blue-600 hover:bg-blue-700',    text: 'text-white', dot: 'bg-blue-600',    pill: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' },
	StreetBike: { bar: 'bg-emerald-600 hover:bg-emerald-700', text: 'text-white', dot: 'bg-emerald-600', pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' },
	Car:        { bar: 'bg-violet-600 hover:bg-violet-700', text: 'text-white', dot: 'bg-violet-600',  pill: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300' },
	Jeep:       { bar: 'bg-orange-500 hover:bg-orange-600', text: 'text-white', dot: 'bg-orange-500',  pill: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300' },
	Other:      { bar: 'bg-rose-600 hover:bg-rose-700',    text: 'text-white', dot: 'bg-rose-600',    pill: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300' },
};
const colorFor = (type: string) => TYPE_COLORS[type] ?? TYPE_COLORS.Other!;

interface CalEvent {
	id: string;
	kind: 'booked' | 'maintenance';
	bookingId?: string;
	bookingNumber?: string;
	customerName?: string;
	customerPhone?: string;
	vehicleId: string;
	vehicleName: string;
	vehicleType: VehicleType;
	daySet: Set<string>;
	startDate: string; // earliest date in this month
}

function buildEvents(data: CalendarMatrixResult): CalEvent[] {
	const map = new Map<string, CalEvent>();
	for (const v of data.vehicles) {
		for (const [dateStr, cell] of Object.entries(v.dates)) {
			if (cell.status === 'booked' && cell.booking) {
				const key = cell.booking.id;
				let e = map.get(key);
				if (!e) {
					e = {
						id: key, kind: 'booked',
						bookingId: cell.booking.id,
						bookingNumber: cell.booking.bookingNumber,
						customerName: cell.booking.customerName,
						customerPhone: cell.booking.customerPhone,
						vehicleId: v.id, vehicleName: v.name,
						vehicleType: v.type as VehicleType,
						daySet: new Set(), startDate: dateStr,
					};
					map.set(key, e);
				}
				e.daySet.add(dateStr);
				if (dateStr < e.startDate) e.startDate = dateStr;
			} else if (cell.status === 'maintenance') {
				const key = `maint-${v.id}`;
				let e = map.get(key);
				if (!e) {
					e = {
						id: key, kind: 'maintenance',
						vehicleId: v.id, vehicleName: v.name,
						vehicleType: v.type as VehicleType,
						daySet: new Set(), startDate: dateStr,
					};
					map.set(key, e);
				}
				e.daySet.add(dateStr);
				if (dateStr < e.startDate) e.startDate = dateStr;
			}
		}
	}
	return [...map.values()];
}

interface DayCell { date: Date; dateStr: string; inMonth: boolean }

function buildMonthGrid(month: string): DayCell[][] {
	const [y, m] = month.split('-').map(Number);
	const first = new Date(y, m - 1, 1);
	const startWeekday = first.getDay();
	const cells: DayCell[] = [];
	for (let i = 0; i < 42; i++) {
		const d = new Date(y, m - 1, 1 - startWeekday + i);
		cells.push({ date: d, dateStr: fmt(d), inMonth: d.getMonth() === m - 1 });
	}
	const weeks: DayCell[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

interface PlacedBar { e: CalEvent; start: number; end: number; lane: number }

function layoutWeek(week: DayCell[], events: CalEvent[]): { placed: PlacedBar[]; overflowPerDay: number[] } {
	const weekDates = week.map((c) => c.dateStr);
	const candidates = events
		.filter((e) => weekDates.some((d) => e.daySet.has(d)))
		.map((e) => {
			const cols = weekDates.map((d, i) => (e.daySet.has(d) ? i : -1)).filter((i) => i >= 0);
			return { e, start: Math.min(...cols), end: Math.max(...cols) };
		})
		.sort((a, b) => a.start - b.start || b.end - a.end);

	const laneEnds: number[] = [];
	const placed: PlacedBar[] = [];
	const hidden: { start: number; end: number }[] = [];

	for (const c of candidates) {
		let lane = laneEnds.findIndex((end) => c.start > end);
		if (lane === -1) { lane = laneEnds.length; laneEnds.push(c.end); }
		else laneEnds[lane] = Math.max(laneEnds[lane]!, c.end);

		if (lane < MAX_LANES) placed.push({ e: c.e, start: c.start, end: c.end, lane });
		else hidden.push({ start: c.start, end: c.end });
	}

	const overflowPerDay = new Array(7).fill(0);
	for (const h of hidden) for (let i = h.start; i <= h.end; i++) overflowPerDay[i]!++;
	return { placed, overflowPerDay };
}

function EventBar({ b }: { b: PlacedBar }) {
	const isMaint = b.e.kind === 'maintenance';
	const c = colorFor(b.e.vehicleType);
	const label = isMaint
		? `🔧 ${b.e.vehicleName}`
		: b.e.customerName
			? `${b.e.vehicleName} · ${b.e.customerName}`
			: b.e.vehicleName;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						'flex h-full w-full items-center gap-1 rounded-sm px-1.5 text-[11px] font-medium truncate leading-none',
						isMaint
							? 'bg-amber-200 text-amber-900 hover:bg-amber-300 dark:bg-amber-500/25 dark:text-amber-200 border border-amber-400/60 dark:border-amber-500/40'
							: cn(c.bar, c.text),
					)}
					title={label}
				>
					{isMaint && <Wrench className="size-3 shrink-0 opacity-70" />}
					<span className="truncate">{label}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-64 text-sm" sideOffset={6}>
				<div className="flex items-start gap-2">
					<span className={cn('mt-0.5 size-3 shrink-0 rounded-full', isMaint ? 'bg-amber-500' : c.dot)} />
					<div className="flex-1 min-w-0">
						<div className="font-semibold truncate">{b.e.vehicleName}</div>
						{isMaint ? (
							<div className="mt-0.5 text-xs text-muted-foreground">Under maintenance</div>
						) : (
							<>
								<div className="mt-0.5 text-xs font-mono text-muted-foreground">{b.e.bookingNumber}</div>
								{b.e.customerName && <div className="text-xs text-foreground/80">{b.e.customerName}</div>}
								{b.e.customerPhone && <div className="text-xs text-muted-foreground">{b.e.customerPhone}</div>}
							</>
						)}
						<div className="mt-3 flex gap-3 border-t pt-2">
							<Link to={`/vehicles/${b.e.vehicleId}`} className="text-xs font-medium text-primary hover:underline">
								Vehicle →
							</Link>
							{!isMaint && b.e.bookingId && (
								<Link to={`/bookings/${b.e.bookingId}`} className="text-xs font-medium text-primary hover:underline">
									Booking →
								</Link>
							)}
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export function MonthCalendar({ data }: { data: CalendarMatrixResult }) {
	const today = todayStr();
	const weeks = buildMonthGrid(data.month);
	const events = buildEvents(data);

	// Calculate dynamic row height: enough for header + MAX_LANES bars + padding
	const ROW_MIN_H = DATE_HEADER_H + MAX_LANES * LANE_H + 12;

	return (
		<div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
			{/* Weekday header */}
			<div className="grid grid-cols-7 border-b border-border">
				{WEEKDAYS.map((day) => (
					<div
						key={day}
						className="border-r border-border px-2 py-2.5 text-center last:border-r-0"
					>
						<span className="hidden md:block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
							{day}
						</span>
						<span className="md:hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground">
							{day.slice(0, 3)}
						</span>
					</div>
				))}
			</div>

			{/* Week rows */}
			<div className="grid flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
				{weeks.map((week, wi) => {
					const { placed, overflowPerDay } = layoutWeek(week, events);
					return (
						<div
							key={wi}
							className="relative grid grid-cols-7"
							style={{ minHeight: ROW_MIN_H }}
						>
							{/* Day cells */}
							{week.map((cell, idx) => {
								const isToday = cell.dateStr === today;
								const isSunOrSat = idx === 0 || idx === 6;
								return (
									<div
										key={idx}
										className={cn(
											'relative border-r border-b border-border last:border-r-0 p-1.5',
											!cell.inMonth && 'bg-muted/25',
											isSunOrSat && cell.inMonth && 'bg-muted/10',
										)}
									>
										{/* Date number */}
										<div className="flex items-start justify-end">
											<span
												className={cn(
													'flex size-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
													isToday
														? 'bg-primary text-primary-foreground font-bold shadow-sm'
														: cell.inMonth
															? 'text-foreground hover:bg-muted cursor-default'
															: 'text-muted-foreground/40',
												)}
											>
												{cell.date.getDate()}
											</span>
										</div>
										{/* +N more */}
										{overflowPerDay[idx]! > 0 && (
											<div className="mt-1 text-[10px] font-medium text-muted-foreground">
												+{overflowPerDay[idx]} more
											</div>
										)}
									</div>
								);
							})}

							{/* Event bars (absolutely positioned over the grid) */}
							{placed.map((b) => (
								<div
									key={b.e.id}
									className="absolute px-0.5 pointer-events-none"
									style={{
										left: `${(b.start / 7) * 100}%`,
										width: `${((b.end - b.start + 1) / 7) * 100}%`,
										top: DATE_HEADER_H + b.lane * LANE_H,
										height: LANE_H - 3,
									}}
								>
									<div className="pointer-events-auto h-full">
										<EventBar b={b} />
									</div>
								</div>
							))}
						</div>
					);
				})}
			</div>

			{/* Empty state */}
			{events.length === 0 && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<p className="text-sm text-muted-foreground">No bookings or maintenance this month.</p>
				</div>
			)}
		</div>
	);
}
