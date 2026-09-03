import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, User, Car, FileText, Phone, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Spinner } from '@/react-app/components/ui/spinner';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { StatusBadge } from '@/react-app/components/data-display/status-badge';
import { usePayment, useVerifyPayment, useRejectPayment, useDeletePayment } from '../hooks/usePayments';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/react-app/components/ui/dialog';
import { Textarea } from '@/react-app/components/ui/textarea';
import { FormField } from '@/react-app/components/ui/form-field';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import { useState } from 'react';

const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export function PaymentDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: payment, isLoading, error } = usePayment(id!);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !payment) {
		return (
			<div className="space-y-4">
				<Button variant="outline" onClick={() => navigate('/payments')}>
					<ArrowLeft className="size-4 mr-2" />
					Kembali ke Pembayaran
				</Button>
				<div className="text-center py-12">
					<p className="text-muted-foreground">Pembayaran tidak ditemukan</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title={`Pembayaran ${format(new Date(payment.createdAt), 'PPP')}`}
				actions={
					<div className="flex gap-2">
						{payment.status === 'Pending' && (
							<>
								<VerifyDialog paymentId={payment.id} />
								<DeleteDialog paymentId={payment.id} />
							</>
						)}
						<Button variant="outline" onClick={() => navigate('/payments')}>
							<ArrowLeft className="size-4 mr-2" />
							Kembali
						</Button>
					</div>
				}
			/>

			{/* Status Banner */}
			<div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
				<StatusBadge.Payment
					status={payment.status.toLowerCase() as 'pending' | 'verified' | 'failed'}
					size="lg"
				/>
				<div className="text-sm text-muted-foreground">
					{payment.method.replace(/_/g, ' ')} payment
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Payment Details */}
				<div className="space-y-4 p-4 border rounded-lg">
					<h3 className="font-semibold flex items-center gap-2">
						<CreditCard className="size-4" />
						Detail Pembayaran
					</h3>
					<div className="space-y-3">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Nominal</span>
							<span className="text-xl font-semibold">
								{formatCurrency(payment.amount, payment.currency)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Metode</span>
							<span>{payment.method.replace(/_/g, ' ')}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Dicatat</span>
							<span>{format(new Date(payment.createdAt), 'PPP p')}</span>
						</div>
						{payment.transactionReference && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">Referensi</span>
								<span className="font-mono text-sm">{payment.transactionReference}</span>
							</div>
						)}
						{payment.proofUrl && (
							<div className="pt-2">
								<a
									href={payment.proofUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
								>
									Lihat Bukti <ExternalLink className="size-3" />
								</a>
							</div>
						)}
					</div>
				</div>

				{/* Booking Info */}
				<div className="space-y-4 p-4 border rounded-lg">
					<h3 className="font-semibold flex items-center gap-2">
						<FileText className="size-4" />
						Booking
					</h3>
					<div className="space-y-3">
						<div
							className="font-mono text-primary cursor-pointer hover:underline"
							onClick={() => navigate(`/bookings/${payment.bookingId ?? payment.booking?.id}`)}
						>
							{payment.booking.bookingNumber}
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Total Tagihan</span>
							<span>{formatCurrency(payment.booking.totalAmount, payment.booking.currency)}</span>
						</div>
					</div>
				</div>

				{/* Customer Info */}
				<div className="space-y-4 p-4 border rounded-lg">
					<h3 className="font-semibold flex items-center gap-2">
						<User className="size-4" />
						Pelanggan
					</h3>
					<div className="space-y-3">
						<div className="font-medium">{payment.booking.customer.name}</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Phone className="size-4" />
							{payment.booking.customer.phone}
						</div>
					</div>
				</div>

				{/* Vehicle Info */}
				<div className="space-y-4 p-4 border rounded-lg">
					<h3 className="font-semibold flex items-center gap-2">
						<Car className="size-4" />
						Kendaraan
					</h3>
					<div className="space-y-3">
						<div className="font-medium">{payment.booking.vehicle.name}</div>
						<div className="text-sm text-muted-foreground">
							{payment.booking.vehicle.plateNumber}
						</div>
					</div>
				</div>
			</div>

			{/* Notes */}
			{payment.notes && (
				<div className="space-y-4 p-4 border rounded-lg">
					<h3 className="font-semibold">Catatan</h3>
					<p className="text-muted-foreground whitespace-pre-wrap">{payment.notes}</p>
				</div>
			)}

			{/* Verification Info */}
			{payment.verifiedBy && (
				<div className="space-y-4 p-4 border rounded-lg bg-green-50 border-green-200">
					<h3 className="font-semibold text-green-800">Terverifikasi</h3>
					<div className="text-sm text-green-700">
						oleh {payment.verifiedBy.name} pada {format(new Date(payment.verifiedAt!), 'PPP p')}
					</div>
				</div>
			)}

			{/* Rejection Info */}
			{payment.rejectionReason && (
				<div className="space-y-4 p-4 border rounded-lg bg-red-50 border-red-200">
					<h3 className="font-semibold text-red-800">Ditolak</h3>
					<div className="text-sm text-red-700">{payment.rejectionReason}</div>
				</div>
			)}
		</div>
	);
}

function VerifyDialog({ paymentId }: { paymentId: string }) {
	const [open, setOpen] = useState(false);
	const [isVerify, setIsVerify] = useState(true);
	const [rejectionReason, setRejectionReason] = useState('');
	const verifyPayment = useVerifyPayment();
	const rejectPayment = useRejectPayment();

	const handleVerify = async () => {
		try {
			if (isVerify) {
				await verifyPayment.mutateAsync({ id: paymentId, verified: true });
			} else {
				// TC-PAY-003: reject goes to /reject (status Failed + reason)
				await rejectPayment.mutateAsync({ id: paymentId, reason: rejectionReason });
			}
			setOpen(false);
		} catch (e: unknown) {
			toast({
				title: isVerify ? 'Gagal memverifikasi pembayaran' : 'Gagal menolak pembayaran',
				description: extractApiError(e),
				variant: 'destructive',
			});
		}
	};

	return (
		<>
			<Button onClick={() => { setIsVerify(true); setOpen(true); }}>
				Verifikasi
			</Button>
			<Button variant="outline" onClick={() => { setIsVerify(false); setOpen(true); }}>
				Tolak
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{isVerify ? 'Verifikasi Pembayaran' : 'Tolak Pembayaran'}</DialogTitle>
						<DialogDescription>
							{isVerify
								? 'Yakin ingin memverifikasi pembayaran ini?'
								: 'Berikan alasan penolakan pembayaran ini.'}
						</DialogDescription>
					</DialogHeader>

					{!isVerify && (
						<FormField label="Alasan Penolakan" required>
							<Textarea
								value={rejectionReason}
								onChange={(e) => setRejectionReason(e.target.value)}
								placeholder="Masukkan alasan penolakan..."
								rows={3}
							/>
						</FormField>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} disabled={verifyPayment.isPending || rejectPayment.isPending}>
							Batal
						</Button>
						<Button
							variant={isVerify ? 'default' : 'destructive'}
							onClick={handleVerify}
							disabled={verifyPayment.isPending || rejectPayment.isPending || (!isVerify && rejectionReason.length < 10)}
						>
							{verifyPayment.isPending || rejectPayment.isPending ? 'Memproses...' : isVerify ? 'Verifikasi' : 'Tolak'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function DeleteDialog({ paymentId }: { paymentId: string }) {
	const [open, setOpen] = useState(false);
	const deletePayment = useDeletePayment();

	const handleDelete = async () => {
		try {
			await deletePayment.mutateAsync(paymentId);
			setOpen(false);
		} catch (e: unknown) {
			toast({
				title: 'Gagal menghapus pembayaran',
				description: extractApiError(e),
				variant: 'destructive',
			});
		}
	};

	return (
		<>
			<Button variant="destructive" onClick={() => setOpen(true)}>
				Hapus
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Hapus Pembayaran</DialogTitle>
						<DialogDescription>
							Yakin ingin menghapus pembayaran ini? Tindakan ini tidak bisa dibatalkan.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} disabled={deletePayment.isPending}>
							Batal
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deletePayment.isPending}
						>
							{deletePayment.isPending ? 'Menghapus...' : 'Hapus'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
