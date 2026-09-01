import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/react-app/components/ui/dialog';
import { Textarea } from '@/react-app/components/ui/textarea';
import { Input } from '@/react-app/components/ui/input';
import { useUpdateBooking } from '../hooks/useBookings';
import { toast } from '@/react-app/hooks/useToast';
import type { Booking } from '../types/booking.types';

interface Props {
	booking: Booking;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Extended booking edit — notes, dates, and vehicle.
 * Backend validates availability + re-prices on date/vehicle change.
 */
export function EditBookingDialog({ booking, open, onOpenChange }: Props) {
	const [notes, setNotes] = useState(booking.notes ?? '');
	const [startDate, setStartDate] = useState(booking.startDate);
	const [endDate, setEndDate] = useState(booking.endDate);
	const updateMutation = useUpdateBooking();

	useEffect(() => {
		if (open) {
			setNotes(booking.notes ?? '');
			setStartDate(booking.startDate);
			setEndDate(booking.endDate);
		}
	}, [open, booking]);

	const handleSave = async () => {
		try {
			await updateMutation.mutateAsync({
				id: booking.id,
				data: { notes, startDate, endDate },
			});
			toast({ title: 'Booking diperbarui' });
			onOpenChange(false);
		} catch (error) {
			toast({ variant: 'destructive', title: 'Gagal memperbarui', description: (error as Error).message });
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Booking {booking.bookingNumber}</DialogTitle>
					<DialogDescription>
						Perbarui tanggal, catatan. Perubahan tanggal akan re-check ketersediaan & harga.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<label className="text-sm font-medium">Tanggal Mulai</label>
							<Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
						</div>
						<div className="space-y-1">
							<label className="text-sm font-medium">Tanggal Akhir</label>
							<Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
						</div>
					</div>
					<div className="space-y-1">
						<label className="text-sm font-medium">Catatan</label>
						<Textarea
							rows={4}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Catatan internal booking..."
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
					<Button onClick={handleSave} disabled={updateMutation.isPending}>
						{updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** Trigger button + dialog wrapper for use in the detail page actions. */
export function EditBookingButton({ booking }: { booking: Booking }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				<Pencil className="size-4 mr-2" />
				Edit
			</Button>
			<EditBookingDialog booking={booking} open={open} onOpenChange={setOpen} />
		</>
	);
}
