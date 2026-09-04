import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, CheckCircle, Wrench, XCircle, Filter, ScanBarcode, ChevronDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { api } from '@/react-app/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

interface VehicleAvailability {
	id: string;
	name: string;
	type: string;
	plateNumber: string;
	status: string;
	currentBooking: {
		bookingNumber: string;
		customerName: string;
		startDate: string;
		endDate: string;
	} | null;
	nextAvailableDate: string | null;
}

interface AvailabilityTimeline {
	vehicles: VehicleAvailability[];
	summary: {
		total: number;
		available: number;
		rented: number;
		maintenance: number;
		inactive: number;
	};
}

// Null/invalid-safe date formatter. date-fns `format()` throws
// `RangeError: Invalid time value` on `new Date(undefined | "" | "bad")`.
// Returns '' for missing/empty/unparseable input so callers can fall back.
function safeFormat(date: string | null | undefined, pattern: string): string {
	if (!date) return '';
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return '';
	return format(d, pattern);
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
	Available: {
		color: 'text-emerald-700',
		bgColor: 'bg-emerald-500',
		icon: <CheckCircle className="size-5" />,
		label: 'Tersedia'
	},
	Rented: {
		color: 'text-amber-700',
		bgColor: 'bg-amber-500',
		icon: <Car className="size-5" />,
		label: 'Disewa'
	},
	Maintenance: {
		color: 'text-red-700',
		bgColor: 'bg-red-500',
		icon: <Wrench className="size-5" />,
		label: 'Perawatan'
	},
	Inactive: {
		color: 'text-gray-700',
		bgColor: 'bg-gray-400',
		icon: <XCircle className="size-5" />,
		label: 'Inactive'
	},
};

const TYPE_LABELS: Record<string, string> = {
	TrailBike: 'Trail Bike',
	StreetBike: 'Street Bike',
};

// LC-005: filter pill labels in ID (values stay lowercase keys)
const STATUS_FILTER_LABELS: Record<string, string> = {
	all: 'Semua',
	available: 'Tersedia',
	rented: 'Disewa',
	maintenance: 'Perawatan',
	inactive: 'Nonaktif',
};

export function VehicleAvailabilityPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const { data: timeline, isLoading } = useQuery({
		queryKey: ['vehicles', 'availability-timeline'],
		queryFn: () => api.get<ApiSuccessResponse<AvailabilityTimeline>>('/v1/vehicles/availability-timeline'),
		select: (data) => data.data,
	});

	// Auto-focus search input on mount
	useEffect(() => {
		if (searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, []);

	// Filter vehicles based on search and status
	const filteredVehicles = timeline?.vehicles.filter((vehicle) => {
		const matchesSearch = searchQuery === '' ||
			vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
			vehicle.type.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus = statusFilter === 'all' ||
			vehicle.status.toLowerCase() === statusFilter.toLowerCase();

		return matchesSearch && matchesStatus;
	}) ?? [];

	const summary = timeline?.summary;

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Mobile-optimized header */}
			<div className="bg-white border-b sticky top-0 z-10">
				<div className="px-4 py-3">
					<h1 className="text-lg font-semibold text-gray-900">Ketersediaan Kendaraan</h1>
					<p className="text-sm text-gray-500">Pindai atau cari kendaraan</p>
				</div>
			</div>

			<div className="px-4 py-4 space-y-4">
				{/* Search Bar - Large and prominent for scanning */}
				<div className="relative">
					<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
						<ScanBarcode className="h-6 w-6 text-gray-400" />
					</div>
					<input
						ref={searchInputRef}
						type="text"
						placeholder="Pindai barcode atau masukkan nomor plat..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery('')}
							className="absolute inset-y-0 right-0 pr-4 flex items-center"
						>
							<XCircle className="h-5 w-5 text-gray-400" />
						</button>
					)}
				</div>

				{/* Filter Button */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="lg"
						onClick={() => setIsFilterOpen(!isFilterOpen)}
						className="flex-1 justify-between"
					>
						<div className="flex items-center gap-2">
							<Filter className="h-5 w-5" />
 							<span>Status: {STATUS_FILTER_LABELS[statusFilter] ?? statusFilter}</span>
						</div>
						<ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
					</Button>
				</div>

				{/* Filter Options */}
				{isFilterOpen && (
					<div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-xl border shadow-sm">
						{['all', 'available', 'rented', 'maintenance', 'inactive'].map((status) => (
							<button
								key={status}
								onClick={() => {
									setStatusFilter(status);
									setIsFilterOpen(false);
								}}
								className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
									statusFilter === status
										? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
										: 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
								}`}
							>
								{STATUS_FILTER_LABELS[status] ?? status}
							</button>
						))}
					</div>
				)}

				{/* Stats Summary - Compact for mobile */}
				{summary && (
					<div className="grid grid-cols-5 gap-2">
						<div className="bg-white p-3 rounded-xl border text-center shadow-sm">
							<div className="text-xl font-bold text-gray-900">{summary.total}</div>
							<div className="text-xs text-gray-500">Total</div>
						</div>
						<div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
							<div className="text-xl font-bold text-emerald-600">{summary.available}</div>
							<div className="text-xs text-emerald-700">Siap</div>
						</div>
						<div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
							<div className="text-xl font-bold text-amber-600">{summary.rented}</div>
							<div className="text-xs text-amber-700">Disewa</div>
						</div>
						<div className="bg-red-50 p-3 rounded-xl border border-red-200 text-center">
							<div className="text-xl font-bold text-red-600">{summary.maintenance}</div>
							<div className="text-xs text-red-700">Servis</div>
						</div>
						<div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
							<div className="text-xl font-bold text-gray-600">
								{summary.total ? Math.round((summary.rented / summary.total) * 100) : 0}%
							</div>
							<div className="text-xs text-gray-700">Pakai</div>
						</div>
					</div>
				)}

				{/* Vehicle Cards - Large touch targets */}
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="bg-white p-5 rounded-2xl border animate-pulse">
								<div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
								<div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
								<div className="h-4 bg-gray-200 rounded w-1/4"></div>
							</div>
						))}
					</div>
				) : filteredVehicles.length === 0 ? (
					<div className="text-center py-12">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
							<Car className="h-8 w-8 text-gray-400" />
						</div>
						<p className="text-gray-500 text-lg">Tidak ada kendaraan ditemukan</p>
						<p className="text-gray-400 text-sm mt-1">
							{searchQuery ? 'Coba kata kunci lain' : 'Belum ada kendaraan'}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<p className="text-sm text-gray-500 font-medium">
							{filteredVehicles.length} kendaraan
						</p>

						{filteredVehicles.map((vehicle) => {
							const config = STATUS_CONFIG[vehicle.status] ?? STATUS_CONFIG.Inactive;
							const bookingRange = vehicle.currentBooking
								? [
										safeFormat(vehicle.currentBooking.startDate, 'dd MMM'),
										safeFormat(vehicle.currentBooking.endDate, 'dd MMM yyyy'),
									]
										.filter(Boolean)
										.join(' - ')
								: '';
							const nextAvailable = safeFormat(vehicle.nextAvailableDate, 'dd MMM yyyy');
							return (
								<Link
									key={vehicle.id}
									to={`/vehicles/${vehicle.id}`}
									className="block bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm active:scale-[0.98] transition-transform"
								>
									{/* Status indicator stripe */}
									<div className="flex items-start gap-4">
										<div className={`w-2 h-16 rounded-full ${config.bgColor}`}></div>
										<div className="flex-1 min-w-0">
											{/* Vehicle name and status */}
											<div className="flex items-center justify-between mb-2">
												<h3 className="text-xl font-bold text-gray-900 truncate">
													{vehicle.name}
												</h3>
												<Badge
													variant="outline"
													className={`${config.color} border-current ml-2 shrink-0`}
												>
													{config.icon}
													<span className="ml-1">{config.label}</span>
												</Badge>
											</div>

											{/* Plate number - Large and prominent */}
											<div className="flex items-center gap-2 mb-3">
												<ScanBarcode className="h-5 w-5 text-gray-400" />
												<span className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
													{vehicle.plateNumber}
												</span>
											</div>

											{/* Vehicle type */}
											<div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
												<Car className="h-4 w-4" />
												<span>{TYPE_LABELS[vehicle.type] || vehicle.type}</span>
											</div>

											{/* Current booking info */}
											{vehicle.currentBooking && (
												<div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
													<div className="flex items-center gap-2 text-amber-800 font-medium">
														<Car className="h-4 w-4" />
														<span>Sedang Disewa</span>
													</div>
													<div className="mt-2 space-y-1">
														<div className="flex items-center gap-2 text-sm text-amber-700">
															<span className="font-medium">{vehicle.currentBooking.customerName}</span>
														</div>
														{bookingRange && (
															<div className="flex items-center gap-2 text-sm text-amber-600">
																<Calendar className="h-3 w-3" />
																<span>{bookingRange}</span>
															</div>
														)}
														<div className="text-xs text-amber-600 mt-1">
															Booking: {vehicle.currentBooking.bookingNumber}
														</div>
													</div>
												</div>
											)}

											{/* Next available date */}
											{nextAvailable && !vehicle.currentBooking && (
												<div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
													<div className="flex items-center gap-2 text-emerald-800">
														<Calendar className="h-4 w-4" />
														<span className="text-sm font-medium">
															Tersedia mulai {nextAvailable}
														</span>
													</div>
												</div>
											)}

											{/* Available now indicator */}
											{vehicle.status === 'Available' && !vehicle.currentBooking && (
												<div className="flex items-center gap-2 text-emerald-600 mt-2">
													<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
													<span className="text-sm font-medium">Siap disewa</span>
												</div>
											)}
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
