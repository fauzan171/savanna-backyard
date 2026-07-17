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
import { useUpdateBooking } from '../hooks/useBookings';
import { toast } from '@/react-app/hooks/useToast';
import type { Booking } from '../types/booking.types';

interface Props {
	booking: Booking;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Lightweight booking edit. Backend PATCH /bookings/:id currently accepts only
 * `notes`, so this dialog edits notes. Add fields here when the update schema
 * expands (dates/vehicle require pricing + availability re-check — not safe to
 * edit casually).
 */
export function EditBookingDialog({ booking, open, onOpenChange }: Props) {
	const [notes, setNotes] = useState(booking.notes ?? '');
	const updateMutation = useUpdateBooking();

	useEffect(() => {
		if (open) setNotes(booking.notes ?? '');
	}, [open, booking.notes]);

	const handleSave = async () => {
		try {
			await updateMutation.mutateAsync({ id: booking.id, data: { notes } });
			toast({ title: 'Booking diperbarui' });
			onOpenChange(false);
		} catch (error) {
			toast({ variant: 'destructive', title: 'Gagal memperbarui', description: (error as Error).message });
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Booking {booking.bookingNumber}</DialogTitle>
						<DialogDescription>
							Perbarui catatan booking. Hubungi dev untuk mengubah tanggal/kendaraan (perlu cek ketersediaan & harga).
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<label className="text-sm font-medium">Catatan</label>
						<Textarea
							rows={6}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Catatan internal booking..."
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Batal
						</Button>
						<Button onClick={handleSave} disabled={updateMutation.isPending}>
							{updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
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
