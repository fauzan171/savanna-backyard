import { Edit, Wrench, Calendar, Gauge, Car, Trash2 } from 'lucide-react';
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
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h2 className="text-2xl font-bold">{vehicle.name}</h2>
						<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
					</div>
					<p className="text-muted-foreground mt-1">
		{vehicle.plateNumber} - {vehicleTypeLabels[vehicle.type] || vehicle.type}
					</p>
				</div>
				<div className="flex gap-2">
					{onEdit && (
						<Button variant="outline" onClick={onEdit}>
							<Edit className="size-4 mr-2" />
							Edit
						</Button>
					)}
					{onStatusChange && (
						<Button variant="outline" onClick={onStatusChange}>
							<Wrench className="size-4 mr-2" />
							Ubah Status
						</Button>
					)}
					{onDelete && (
						<Button variant="destructive" onClick={onDelete}>
							<Trash2 className="size-4 mr-2" />
							Hapus
						</Button>
					)}
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
						<CardTitle className="text-lg">Foto</CardTitle>
					</CardHeader>
					<CardContent>
						<img
							src={vehicle.photoUrl}
							alt={vehicle.name}
							className="max-w-md rounded-lg border"
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
