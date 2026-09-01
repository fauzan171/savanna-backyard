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
import { labelFromMap, vehicleStatusLabels, vehicleTypeLabels } from '@/react-app/lib/labels';

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
		<div className="flex flex-col overflow-hidden -mx-3 md:-mx-6 -mt-3 md:-mt-6 -mb-3 md:-mb-6 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]">
			{/* Top toolbar — compact, Google Calendar-like */}
			<div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-3 shrink-0">
				{/* Logo / title */}
				<div className="flex items-center gap-2 mr-2">
					<Calendar className="size-5 text-primary" />
					<span className="text-lg font-semibold tracking-tight">Kalender Kendaraan</span>
				</div>

				{/* Today button */}
				<Button
					variant="outline"
					size="sm"
					onClick={() => setMonth(currentMonth())}
					disabled={isCurrentMonth}
					className="shrink-0"
				>
					Hari ini
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
						<SelectValue placeholder="Semua jenis" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Semua jenis</SelectItem>
						<SelectItem value="TrailBike">{vehicleTypeLabels.TrailBike}</SelectItem>
						<SelectItem value="StreetBike">{vehicleTypeLabels.StreetBike}</SelectItem>
						<SelectItem value="Car">{vehicleTypeLabels.Car}</SelectItem>
						<SelectItem value="Jeep">{vehicleTypeLabels.Jeep}</SelectItem>
						<SelectItem value="Other">{vehicleTypeLabels.Other}</SelectItem>
					</SelectContent>
				</Select>

				<Select value={status ?? 'all'} onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}>
					<SelectTrigger className="h-8 w-[150px] text-xs">
						<SelectValue placeholder="Semua status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Semua status</SelectItem>
						<SelectItem value="Available">{labelFromMap(vehicleStatusLabels, 'Available')}</SelectItem>
						<SelectItem value="Rented">{labelFromMap(vehicleStatusLabels, 'Rented')}</SelectItem>
						<SelectItem value="Maintenance">{labelFromMap(vehicleStatusLabels, 'Maintenance')}</SelectItem>
						<SelectItem value="Inactive">{labelFromMap(vehicleStatusLabels, 'Inactive')}</SelectItem>
					</SelectContent>
				</Select>

				{/* Legend */}
				<div className="hidden lg:flex items-center gap-3 border-l pl-3 text-xs">
					<LegendDot color="bg-blue-600" label={vehicleTypeLabels.TrailBike} />
					<LegendDot color="bg-emerald-600" label={vehicleTypeLabels.StreetBike} />
					<LegendDot color="bg-violet-600" label={vehicleTypeLabels.Car} />
					<LegendDot color="bg-orange-500" label="Jeep" />
					<LegendDot color="bg-amber-100 border border-amber-300 dark:bg-amber-500/20" label="Perawatan" textClass="text-amber-700 dark:text-amber-400" />
				</div>
			</div>

			{/* Calendar body — fills remaining height */}
			<div className="flex-1 overflow-auto px-4 py-4">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<div className="flex flex-col items-center gap-3 text-muted-foreground">
							<Spinner size="lg" />
							<span className="text-sm">Memuat kalender...</span>
						</div>
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center">
						<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
							<p className="font-medium">Kalender gagal dimuat</p>
							<p className="mt-1 text-sm opacity-80">Muat ulang halaman atau coba beberapa saat lagi.</p>
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
