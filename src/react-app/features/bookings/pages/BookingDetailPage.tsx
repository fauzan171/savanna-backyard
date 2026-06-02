import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, User, Car, Calendar, CreditCard, FileText, Phone, Mail } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { Spinner } from '@/react-app/components/ui/spinner';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { StatusBadge } from '@/react-app/components/data-display/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/react-app/components/ui/tabs';
import { useBooking } from '../hooks/useBookings';
import { getAvailableActions } from '../types/booking.types';
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
import { FormField } from '@/react-app/components/ui/form-field';
import { useState } from 'react';
import {
	useConfirmBooking,
	useStartRental,
	useCompleteRental,
	useCancelBooking,
	useExtendBooking,
} from '../hooks/useBookings';

const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export function BookingDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: booking, isLoading, error } = useBooking(id!);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Spinner size="lg" />
			</div>
		);
	}

	if (error || !booking) {
		return (
			<div className="space-y-4">
				<Button variant="outline" onClick={() => navigate('/bookings')}>
					<ArrowLeft className="size-4 mr-2" />
					Back to Bookings
				</Button>
				<div className="text-center py-12">
					<p className="text-muted-foreground">Booking not found</p>
				</div>
			</div>
		);
	}

	const availableActions = getAvailableActions(booking.status);

	return (
		<div className="space-y-6">
			<PageHeader
				title={`Booking ${booking.bookingNumber}`}
				actions={
					<div className="flex gap-2">
						{availableActions.map((action) => (
							<ActionDialog
								key={action.action}
								action={action}
								bookingId={booking.id}
							/>
						))}
						<Button variant="outline" onClick={() => navigate('/bookings')}>
							<ArrowLeft className="size-4 mr-2" />
							Back
						</Button>
					</div>
				}
			/>

			{/* Status Banner */}
			<div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
				<StatusBadge.Booking
					status={booking.status}
					size="lg"
				/>
				<div className="text-sm text-muted-foreground">
					Created on {format(new Date(booking.createdAt), 'PPP')}
				</div>
			</div>

			<Tabs defaultValue="details" className="space-y-6">
				<TabsList>
					<TabsTrigger value="details">Details</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
					<TabsTrigger value="history">History</TabsTrigger>
				</TabsList>

				<TabsContent value="details" className="space-y-6">
					<div className="grid gap-6 md:grid-cols-2">
						{/* Customer Info */}
						<div className="space-y-4 p-4 border rounded-lg">
							<h3 className="font-semibold flex items-center gap-2">
								<User className="size-4" />
								Customer
							</h3>
							<div className="space-y-3">
								<div>
									<div className="font-medium">{booking.customer.name}</div>
									{booking.customer.isBlacklisted && (
										<Badge variant="error" size="sm" className="mt-1">
											Blacklisted
										</Badge>
									)}
								</div>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Phone className="size-4" />
									{booking.customer.phone}
								</div>
								{booking.customer.email && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Mail className="size-4" />
										{booking.customer.email}
									</div>
								)}
							</div>
						</div>

						{/* Vehicle Info */}
						<div className="space-y-4 p-4 border rounded-lg">
							<h3 className="font-semibold flex items-center gap-2">
								<Car className="size-4" />
								Vehicle
							</h3>
							<div className="space-y-3">
								<div className="font-medium">{booking.vehicle.name}</div>
								<div className="text-sm text-muted-foreground">
									{booking.vehicle.plateNumber} • {booking.vehicle.type}
								</div>
								<div className="text-sm">
									{formatCurrency(booking.vehicle.dailyRateIdr, 'IDR')}/day
									{booking.vehicle.dailyRateUsd && (
										<span className="text-muted-foreground">
											{' '}
											({formatCurrency(booking.vehicle.dailyRateUsd, 'USD')})
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Rental Period */}
						<div className="space-y-4 p-4 border rounded-lg">
							<h3 className="font-semibold flex items-center gap-2">
								<Calendar className="size-4" />
								Rental Period
							</h3>
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Start</span>
									<span>{format(new Date(booking.startDate), 'PPP')}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">End</span>
									<span>{format(new Date(booking.endDate), 'PPP')}</span>
								</div>
								{booking.actualReturnDate && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Returned</span>
										<span>{format(new Date(booking.actualReturnDate), 'PPP')}</span>
									</div>
								)}
							</div>
						</div>

						{/* Payment Info */}
						<div className="space-y-4 p-4 border rounded-lg">
							<h3 className="font-semibold flex items-center gap-2">
								<CreditCard className="size-4" />
								Payment
							</h3>
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Terms</span>
									<span>{booking.paymentTerms.replace(/_/g, ' ')}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Currency</span>
									<span>{booking.currency}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Base Amount</span>
									<span>{formatCurrency(booking.baseAmount, booking.currency)}</span>
								</div>
								{booking.addonsAmount > 0 && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Add-ons</span>
										<span>{formatCurrency(booking.addonsAmount, booking.currency)}</span>
									</div>
								)}
								{booking.lateFee > 0 && (
									<div className="flex justify-between text-destructive">
										<span>Late Fee</span>
										<span>{formatCurrency(booking.lateFee, booking.currency)}</span>
									</div>
								)}
								<div className="flex justify-between font-semibold pt-2 border-t">
									<span>Total</span>
									<span>{formatCurrency(booking.totalAmount, booking.currency)}</span>
								</div>
							</div>
						</div>
					</div>

					{/* Add-ons */}
					{booking.addons && booking.addons.length > 0 && (
						<div className="space-y-4 p-4 border rounded-lg">
							<h3 className="font-semibold">Add-ons</h3>
							<div className="space-y-2">
								{booking.addons.map((addon) => (
									<div key={addon.id} className="flex justify-between items-center py-2 border-b last:border-0">
										<div>
											<div className="font-medium">{addon.description}</div>
											<div className="text-sm text-muted-foreground">
												{addon.type.replace(/_/g, ' ')}
												{addon.isMandatory && (
													<Badge variant="outline" size="sm" className="ml-2">
														Mandatory
													</Badge>
												)}
											</div>
										</div>
										<span>{formatCurrency(addon.amount, booking.currency)}</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Notes */}
					{booking.notes && (
						<div className="space-y-4 p-4 border rounded-lg">
							<h3 className="font-semibold flex items-center gap-2">
								<FileText className="size-4" />
								Notes
							</h3>
							<p className="text-muted-foreground whitespace-pre-wrap">{booking.notes}</p>
						</div>
					)}
				</TabsContent>

				<TabsContent value="payments" className="space-y-6">
					<PaymentsTab payments={booking.payments ?? []} paymentSummary={booking.paymentSummary} currency={booking.currency} totalAmount={booking.totalAmount} />
				</TabsContent>

				<TabsContent value="history" className="space-y-6">
					<HistoryTab history={booking.statusHistory ?? []} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function PaymentsTab({ payments, paymentSummary, currency, totalAmount }: {
	payments: Array<{ id: string; amount: number; currency: 'IDR' | 'USD'; method: string; status: string; transactionReference?: string | null; createdAt: string }>;
	paymentSummary: { totalPaid: number; pendingAmount: number; remaining: number };
	currency: 'IDR' | 'USD';
	totalAmount: number;
}) {
	const formatCurrency = (amount: number, cur: 'IDR' | 'USD' = 'IDR') => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: cur,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	return (
		<div className="space-y-6">
			{/* Payment Summary */}
			<div className="grid gap-4 md:grid-cols-4 p-4 border rounded-lg bg-muted/50">
				<div>
					<div className="text-sm text-muted-foreground">Total Amount</div>
					<div className="text-xl font-semibold">
						{formatCurrency(totalAmount, currency)}
					</div>
				</div>
				<div>
					<div className="text-sm text-muted-foreground">Paid</div>
					<div className="text-xl font-semibold text-green-600">
						{formatCurrency(paymentSummary?.totalPaid ?? 0, currency)}
					</div>
				</div>
				<div>
					<div className="text-sm text-muted-foreground">Pending</div>
					<div className="text-xl font-semibold text-yellow-600">
						{formatCurrency(paymentSummary?.pendingAmount ?? 0, currency)}
					</div>
				</div>
				<div>
					<div className="text-sm text-muted-foreground">Remaining</div>
					<div className="text-xl font-semibold text-red-600">
						{formatCurrency(paymentSummary?.remaining ?? 0, currency)}
					</div>
				</div>
			</div>

			{/* Payments List */}
			<div className="border rounded-lg divide-y">
				<div className="p-4 bg-muted/50 font-semibold">Payment Records</div>
				{payments.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground">No payments recorded</div>
				) : (
					payments.map((payment) => (
						<div key={payment.id} className="p-4 flex justify-between items-center">
							<div>
								<div className="font-medium">
									{formatCurrency(payment.amount, payment.currency)}
								</div>
								<div className="text-sm text-muted-foreground">
									{payment.method.replace(/_/g, ' ')} •{' '}
									{format(new Date(payment.createdAt), 'PPP')}
								</div>
								{payment.transactionReference && (
									<div className="text-xs text-muted-foreground">
										Ref: {payment.transactionReference}
									</div>
								)}
							</div>
							<Badge
								variant={
									payment.status === 'Verified'
										? 'success'
										: payment.status === 'Failed'
											? 'error'
											: 'warning'
								}
							>
								{payment.status}
							</Badge>
						</div>
					))
				)}
			</div>
		</div>
	);
}

function HistoryTab({ history }: {
	history: Array<{ id: string; fromStatus: string | null; toStatus: string; notes: string | null; changedBy: { name: string }; createdAt: string }>;
}) {
	return (
		<div className="border rounded-lg divide-y">
			<div className="p-4 bg-muted/50 font-semibold">Status History</div>
			{history.length === 0 ? (
				<div className="p-8 text-center text-muted-foreground">No status changes recorded</div>
			) : (
				history.map((entry) => (
					<div key={entry.id} className="p-4 flex gap-4">
						<div className="flex flex-col items-center">
							<div className="size-3 rounded-full bg-primary" />
							<div className="w-px flex-1 bg-border" />
						</div>
						<div className="flex-1 pb-4">
							<div className="flex items-center gap-2">
								{entry.fromStatus && (
									<>
										<StatusBadge.Booking
											status={entry.fromStatus}
											size="sm"
										/>
										<span className="text-muted-foreground">→</span>
									</>
								)}
								<StatusBadge.Booking
									status={entry.toStatus}
									size="sm"
								/>
							</div>
							<div className="text-sm text-muted-foreground mt-1">
								{format(new Date(entry.createdAt), 'PPP p')} by {entry.changedBy?.name ?? 'System'}
							</div>
							{entry.notes && (
								<div className="text-sm mt-2 text-muted-foreground">{entry.notes}</div>
							)}
						</div>
					</div>
				))
			)}
		</div>
	);
}

function ActionDialog({
	action,
	bookingId,
}: {
	action: { action: string; label: string; variant: 'default' | 'destructive' | 'outline' };
	bookingId: string;
}) {
	const [open, setOpen] = useState(false);
	const [notes, setNotes] = useState('');
	const [reason, setReason] = useState('');
	const [newEndDate, setNewEndDate] = useState('');
	const [startKm, setStartKm] = useState('');
	const [endKm, setEndKm] = useState('');

	const confirmBooking = useConfirmBooking();
	const startRental = useStartRental();
	const completeRental = useCompleteRental();
	const cancelBooking = useCancelBooking();
	const extendBooking = useExtendBooking();

	const handleAction = async () => {
		try {
			switch (action.action) {
				case 'confirm':
					await confirmBooking.mutateAsync({ id: bookingId, notes });
					break;
				case 'start':
					await startRental.mutateAsync({
						id: bookingId,
						startKm: Number(startKm),
						pickupNotes: notes,
					});
					break;
				case 'complete':
					await completeRental.mutateAsync({
						id: bookingId,
						actualReturnDate: new Date().toISOString().split('T')[0],
						endKm: endKm ? Number(endKm) : undefined,
						returnNotes: notes,
					});
					break;
				case 'cancel':
					await cancelBooking.mutateAsync({ id: bookingId, reason });
					break;
				case 'extend':
					await extendBooking.mutateAsync({
						id: bookingId,
						newEndDate,
						notes,
					});
					break;
			}
			setOpen(false);
			setNotes('');
			setReason('');
			setNewEndDate('');
			setStartKm('');
			setEndKm('');
		} catch (e) {
			console.error('Action failed:', e);
		}
	};

	const isLoading =
		confirmBooking.isPending ||
		startRental.isPending ||
		completeRental.isPending ||
		cancelBooking.isPending ||
		extendBooking.isPending;

	const isSubmitDisabled =
		isLoading ||
		(action.action === 'cancel' && reason.length < 10) ||
		(action.action === 'start' && !startKm);

	return (
		<>
			<Button
				variant={action.variant}
				onClick={() => setOpen(true)}
			>
				{action.label}
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{action.label}</DialogTitle>
						<DialogDescription>
							{action.action === 'cancel'
								? 'Please provide a reason for cancelling this booking.'
								: action.action === 'extend'
									? 'Select the new end date for this booking.'
									: action.action === 'start'
										? 'Enter the starting odometer reading to begin the rental.'
										: `Are you sure you want to ${action.label.toLowerCase()} this booking?`}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						{action.action === 'cancel' && (
							<FormField label="Reason" required>
								<Textarea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="Enter reason for cancellation..."
									rows={3}
								/>
							</FormField>
						)}

						{action.action === 'start' && (
							<FormField label="Start Odometer (km)" required>
								<Input
									type="number"
									value={startKm}
									onChange={(e) => setStartKm(e.target.value)}
									placeholder="e.g. 12500"
									min={0}
								/>
							</FormField>
						)}

						{action.action === 'complete' && (
							<FormField label="End Odometer (km)">
								<Input
									type="number"
									value={endKm}
									onChange={(e) => setEndKm(e.target.value)}
									placeholder="e.g. 12800"
									min={0}
								/>
							</FormField>
						)}

						{action.action === 'extend' && (
							<FormField label="New End Date" required>
								<Input
									type="date"
									value={newEndDate}
									onChange={(e) => setNewEndDate(e.target.value)}
								/>
							</FormField>
						)}

						{['confirm', 'start', 'complete', 'extend'].includes(action.action) && (
							<FormField label="Notes">
								<Textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder="Optional notes..."
									rows={3}
								/>
							</FormField>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
							Cancel
						</Button>
						<Button
							variant={action.variant === 'destructive' ? 'destructive' : 'default'}
							onClick={handleAction}
							disabled={isSubmitDisabled}
						>
							{isLoading ? 'Processing...' : action.label}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}