import { Edit, Wrench, Calendar, Gauge, Car, Trash2, Camera, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { Timeline } from '@/react-app/components/ui/timeline';
import type { VehicleWithDetails, VehicleStatus } from '../types/vehicle.types';
import { labelFromMap, vehicleStatusLabels, vehicleTypeLabels } from '@/react-app/lib/labels';

interface VehicleDetailProps {
	vehicle: VehicleWithDetails;
	onEdit?: () => void;
	onStatusChange?: () => void;
	onDelete?: () => void;
}

const statusConfig: Record<VehicleStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
	Available: { variant: 'success', label: vehicleStatusLabels.available },
	Rented: { variant: 'info', label: vehicleStatusLabels.rented },
	Cleaning: { variant: 'default', label: vehicleStatusLabels.cleaning },
	Maintenance: { variant: 'warning', label: vehicleStatusLabels.maintenance },
	Inactive: { variant: 'default', label: vehicleStatusLabels.inactive },
};

export function VehicleDetail({ vehicle, onEdit, onStatusChange, onDelete }: VehicleDetailProps) {
	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	};

	const formatCurrency = (amount: number, currency: 'IDR' | 'USD') => {
		if (currency === 'IDR') {
			return new Intl.NumberFormat('id-ID', {
				style: 'currency',
				currency: 'IDR',
				minimumFractionDigits: 0,
			}).format(amount);
		}
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const statusInfo = statusConfig[vehicle.status];

	// Convert status logs to timeline items
	const statusLogItems = vehicle.statusLogs?.map((log) => ({
		id: log.createdAt,
		title: `${labelFromMap(vehicleStatusLabels, log.statusFrom)} -> ${labelFromMap(vehicleStatusLabels, log.statusTo)}`,
		description: log.notes || undefined,
		date: log.createdAt,
		status: log.statusTo === 'Available' ? 'completed' as const :
			   log.statusTo === 'Maintenance' ? 'current' as const : 'pending' as const,
	})) ?? [];

	// Convert maintenance history to timeline items
	const maintenanceItems = vehicle.maintenanceHistory?.map((record) => ({
		id: record.id,
		title: record.type,
		description: record.description,
		date: record.completedAt || undefined,
		status: record.completedAt ? 'completed' as const : 'current' as const,
	})) ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="rounded-lg border bg-card p-4 sm:p-5">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
						<h2 className="text-xl font-bold sm:text-2xl">{vehicle.name}</h2>
						<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						{vehicle.plateNumber} - {vehicleTypeLabels[vehicle.type] || vehicle.type}
					</p>
				</div>
				<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
					{onEdit && (
						<Button variant="outline" className="h-11" onClick={onEdit}>
							<Edit className="size-4 mr-2" />
							Edit
						</Button>
					)}
					{onStatusChange && (
						<Button variant="outline" className="h-11" onClick={onStatusChange}>
							<Wrench className="size-4 mr-2" />
							Ubah Status
						</Button>
					)}
					{onDelete && (
						<Button variant="destructive" className="col-span-2 h-11 sm:col-span-1" onClick={onDelete}>
							<Trash2 className="size-4 mr-2" />
							Hapus
						</Button>
					)}
				</div>
			</div>
				<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div className="rounded-md bg-muted/70 p-3">
						<p className="text-xs text-muted-foreground">KM Saat Ini</p>
						<p className="mt-1 text-xl font-bold">
							{vehicle.totalKm ? vehicle.totalKm.toLocaleString('id-ID') : '-'}
						</p>
						<p className="text-xs text-muted-foreground">kilometer</p>
					</div>
					<div className="rounded-md bg-muted/70 p-3">
						<p className="text-xs text-muted-foreground">Kondisi</p>
						<p className="mt-1 flex items-center gap-1 font-semibold">
							<BadgeCheck className="size-4 text-[hsl(var(--forest-green))]" />
							{statusInfo.label}
						</p>
					</div>
					<div className="rounded-md bg-muted/70 p-3">
						<p className="text-xs text-muted-foreground">Tahun</p>
						<p className="mt-1 font-semibold">{vehicle.year || '-'}</p>
					</div>
					<div className="rounded-md bg-muted/70 p-3">
						<p className="text-xs text-muted-foreground">Tarif</p>
						<p className="mt-1 font-semibold">{formatCurrency(vehicle.dailyRateIdr, 'IDR')}</p>
					</div>
				</div>
			</div>

			{/* Vehicle Info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Detail Kendaraan</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div className="flex items-center gap-3">
							<Car className="size-4 text-muted-foreground" />
							<div>
								<span className="text-muted-foreground text-sm">Merek/Model: </span>
								<span className="font-medium">
									{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '-'}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Calendar className="size-4 text-muted-foreground" />
							<div>
								<span className="text-muted-foreground text-sm">Tahun: </span>
								<span className="font-medium">{vehicle.year || '-'}</span>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Gauge className="size-4 text-muted-foreground" />
							<div>
								<span className="text-muted-foreground text-sm">Odometer: </span>
								<span className="font-medium">
									{vehicle.totalKm ? `${vehicle.totalKm.toLocaleString()} km` : '-'}
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Pricing */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Harga</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<span className="text-muted-foreground text-sm">Tarif Harian (IDR)</span>
							<p className="text-2xl font-bold">{formatCurrency(vehicle.dailyRateIdr, 'IDR')}</p>
						</div>
						{vehicle.dailyRateUsd && (
							<div>
								<span className="text-muted-foreground text-sm">Tarif Harian (USD)</span>
								<p className="text-2xl font-bold">{formatCurrency(vehicle.dailyRateUsd, 'USD')}</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Description */}
			{vehicle.description && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Deskripsi</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground whitespace-pre-line leading-relaxed">
							{vehicle.description}
						</p>
					</CardContent>
				</Card>
			)}

			{/* Photo */}
			{vehicle.photoUrl && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg">
							<Camera className="size-4" />
							Foto Kondisi Kendaraan
						</CardTitle>
					</CardHeader>
					<CardContent>
						<img
							src={vehicle.photoUrl}
							alt={vehicle.name}
							className="w-full max-w-md rounded-lg border object-cover"
						/>
					</CardContent>
				</Card>
			)}

			{/* Upcoming Bookings */}
			{vehicle.upcomingBookings && vehicle.upcomingBookings.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Booking Mendatang</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{vehicle.upcomingBookings.map((booking) => (
								<div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border">
									<div>
										<p className="font-medium">{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</p>
									</div>
									<Badge variant="info">{booking.status}</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Status History */}
			{statusLogItems.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Riwayat Status</CardTitle>
					</CardHeader>
					<CardContent>
						<Timeline items={statusLogItems.slice(0, 5)} />
					</CardContent>
				</Card>
			)}

			{/* Maintenance History */}
			{maintenanceItems.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Riwayat Perawatan</CardTitle>
					</CardHeader>
					<CardContent>
						<Timeline items={maintenanceItems} />
					</CardContent>
				</Card>
			)}
		</div>
	);
}
