import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, User, Car, Calendar, CreditCard, FileText, Phone, Mail, ClipboardCheck, Send, Bell } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Badge } from '@/react-app/components/ui/badge';
import { Spinner } from '@/react-app/components/ui/spinner';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { StatusBadge } from '@/react-app/components/data-display/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/react-app/components/ui/tabs';
import { useBooking } from '../hooks/useBookings';
import { getAvailableActions, type CompleteRentalRequest } from '../types/booking.types';
import { PenaltyPanel } from '../components/PenaltyPanel';
import { EditBookingButton } from '../components/EditBookingDialog';
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
import { useChecklistsByBooking } from '@/react-app/features/checklists/hooks/useChecklists';
import { ChecklistForm } from '@/react-app/features/checklists/components/ChecklistForm';
import { ChecklistDisplay, ChecklistComparison } from '@/react-app/features/checklists/components/ChecklistDisplay';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

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
						<EditBookingButton booking={booking} />
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
					<TabsTrigger value="condition">Condition</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
					<TabsTrigger value="email">Email</TabsTrigger>
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

				<TabsContent value="condition" className="space-y-6">
					<ConditionTab
						bookingId={booking.id}
						vehicleName={booking.vehicle.name}
						plateNumber={booking.vehicle.plateNumber}
						bookingStatus={booking.status}
					/>
				</TabsContent>

				<TabsContent value="payments" className="space-y-6">
					<PaymentsTab payments={booking.payments ?? []} paymentSummary={booking.paymentSummary} currency={booking.currency} totalAmount={booking.totalAmount} />
					<PenaltyPanel bookingId={booking.id} />
				</TabsContent>

				<TabsContent value="email" className="space-y-6">
					<EmailTab
						bookingId={booking.id}
						bookingNumber={booking.bookingNumber}
						customerName={booking.customer.name}
						customerEmail={booking.customer.email}
						vehicleName={booking.vehicle.name}
						startDate={booking.startDate}
						endDate={booking.endDate}
						totalAmount={booking.totalAmount}
						currency={booking.currency}
					/>
				</TabsContent>

				<TabsContent value="history" className="space-y-6">
					<HistoryTab history={booking.statusHistory ?? []} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function ConditionTab({
	bookingId,
	vehicleName,
	plateNumber,
	bookingStatus,
}: {
	bookingId: string;
	vehicleName: string;
	plateNumber: string;
	bookingStatus: string;
}) {
	const { data: checklists, isLoading } = useChecklistsByBooking(bookingId);
	const [showPickupForm, setShowPickupForm] = useState(false);
	const [showReturnForm, setShowReturnForm] = useState(false);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner size="lg" />
			</div>
		);
	}

	const hasPickup = !!checklists?.pickup;
	const hasReturn = !!checklists?.return;
	const bothComplete = hasPickup && hasReturn;

	// Show buttons based on booking status
	const canAddPickup = !hasPickup && (bookingStatus === 'Confirmed' || bookingStatus === 'Active');
	const canAddReturn = hasPickup && !hasReturn && bookingStatus === 'Active';

	return (
		<div className="space-y-6">
			{/* Action Buttons */}
			<div className="flex gap-3">
				{canAddPickup && (
					<Button onClick={() => setShowPickupForm(true)}>
						<ClipboardCheck className="mr-2 size-4" />
						Isi Checklist Pickup
					</Button>
				)}
				{canAddReturn && (
					<Button onClick={() => setShowReturnForm(true)}>
						<ClipboardCheck className="mr-2 size-4" />
						Isi Checklist Return
					</Button>
				)}
				{!canAddPickup && !canAddReturn && !bothComplete && bookingStatus !== 'Completed' && bookingStatus !== 'Cancelled' && (
					<div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
						{!hasPickup
							? 'Checklist pickup bisa diisi setelah booking dikonfirmasi.'
							: 'Checklist return bisa diisi saat rental aktif.'}
					</div>
				)}
			</div>

			{/* Display Checklists */}
			{bothComplete ? (
				<ChecklistComparison
					pickup={checklists!.pickup!}
					returnChecklist={checklists!.return!}
				/>
			) : (
				<div className="grid gap-6 md:grid-cols-2">
					{hasPickup && checklists?.pickup && (
						<ChecklistDisplay checklist={checklists.pickup} />
					)}
					{hasReturn && checklists?.return && (
						<ChecklistDisplay checklist={checklists.return} />
					)}
					{!hasPickup && !hasReturn && (
						<div className="col-span-2 text-center py-12 text-muted-foreground border rounded-lg">
							<ClipboardCheck className="mx-auto size-12 mb-3 opacity-50" />
							<p>Belum ada checklist untuk booking ini.</p>
						</div>
					)}
				</div>
			)}

			{/* Checklist Forms */}
			<ChecklistForm
				open={showPickupForm}
				onOpenChange={setShowPickupForm}
				bookingId={bookingId}
				vehicleName={vehicleName}
				plateNumber={plateNumber}
				type="pickup"
			/>
			<ChecklistForm
				open={showReturnForm}
				onOpenChange={setShowReturnForm}
				bookingId={bookingId}
				vehicleName={vehicleName}
				plateNumber={plateNumber}
				type="return"
			/>
		</div>
	);
}

function EmailTab({
	bookingId,
	bookingNumber,
	customerName,
	customerEmail,
	vehicleName,
	startDate,
	endDate,
	totalAmount,
	currency,
}: {
	bookingId: string;
	bookingNumber: string;
	customerName: string;
	customerEmail: string | null;
	vehicleName: string;
	startDate: string;
	endDate: string;
	totalAmount: number;
	currency: 'IDR' | 'USD';
}) {
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [success, setSuccess] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const formatCurrency = (amount: number, cur: 'IDR' | 'USD' = 'IDR') => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: cur,
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	// Check email service status
	const { data: emailStatus } = useQuery({
		queryKey: ['email-status'],
		queryFn: () => api.get<ApiSuccessResponse<{ configured: boolean; provider: string; fromEmail: string }>>('/v1/emails/status'),
		select: (data) => data.data,
	});

	// Send custom email
	const sendEmail = useMutation({
		mutationFn: (data: { to: string; subject: string; message: string; bookingId?: string }) =>
			api.post<ApiSuccessResponse<{ success: boolean }>>('/v1/emails/send', data),
	});

	// Send booking reminder
	const sendReminder = useMutation({
		mutationFn: (data: { bookingId: string }) =>
			api.post<ApiSuccessResponse<{ success: boolean }>>('/v1/emails/send-reminder', data),
	});

	const handleSendEmail = async () => {
		try {
			setError(null);
			setSuccess(null);

			if (!customerEmail) {
				setError('Customer tidak punya email');
				return;
			}
			if (!subject.trim()) {
				setError('Subject wajib diisi');
				return;
			}
			if (!message.trim()) {
				setError('Pesan wajib diisi');
				return;
			}

			await sendEmail.mutateAsync({
				to: customerEmail,
				subject: subject.trim(),
				message: message.trim(),
				bookingId,
			});

			setSuccess(`Email berhasil dikirim ke ${customerEmail}`);
			setSubject('');
			setMessage('');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal mengirim email');
		}
	};

	const handleSendReminder = async () => {
		try {
			setError(null);
			setSuccess(null);

			if (!customerEmail) {
				setError('Customer tidak punya email');
				return;
			}

			await sendReminder.mutateAsync({ bookingId });

			setSuccess(`Reminder berhasil dikirim ke ${customerEmail}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal mengirim reminder');
		}
	};

	const isSending = sendEmail.isPending || sendReminder.isPending;

	return (
		<div className="space-y-6">
			{/* Email Status */}
			{emailStatus && !emailStatus.configured && (
				<div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
					⚠️ Email service belum dikonfigurasi. Set RESEND_API_KEY di Cloudflare Workers.
				</div>
			)}

			{/* Customer Email Info */}
			<div className="p-4 border rounded-lg">
				<h3 className="font-semibold flex items-center gap-2 mb-3">
					<Mail className="size-4" />
					Email Customer
				</h3>
				{customerEmail ? (
					<div className="flex items-center gap-2">
						<span className="text-sm">{customerName}</span>
						<span className="text-muted-foreground">•</span>
						<a href={`mailto:${customerEmail}`} className="text-sm text-primary hover:underline">
							{customerEmail}
						</a>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Customer belum punya email</p>
				)}
			</div>

			{/* Quick Actions */}
			<div className="flex gap-3">
				<Button
					variant="outline"
					onClick={handleSendReminder}
					disabled={isSending || !customerEmail}
				>
					<Bell className="mr-2 size-4" />
					{sendReminder.isPending ? 'Mengirim...' : 'Kirim Reminder'}
				</Button>
			</div>

			{/* Compose Email */}
			<div className="space-y-4 p-4 border rounded-lg">
				<h3 className="font-semibold flex items-center gap-2">
					<Send className="size-4" />
					Kirim Email Custom
				</h3>

				<FormField label="Subject" required>
					<Input
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						placeholder={`Re: Booking ${bookingNumber}`}
						disabled={isSending}
					/>
				</FormField>

				<FormField label="Pesan" required>
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Tulis pesan untuk customer..."
						rows={8}
						disabled={isSending}
					/>
				</FormField>

				{/* Quick Templates */}
				<div className="space-y-2">
					<p className="text-sm text-muted-foreground">Template cepat:</p>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setSubject(`Konfirmasi Booking ${bookingNumber}`);
								setMessage(`Halo ${customerName},\n\nTerima kasih telah melakukan booking di Savanna Bromo Rental.\n\nDetail Booking:\n- No. Booking: ${bookingNumber}\n- Kendaraan: ${vehicleName}\n- Tanggal: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}\n- Total: ${formatCurrency(totalAmount, currency)}\n\nSilakan hubungi kami jika ada pertanyaan.\n\nSalam,\nSavanna Bromo Rental`);
							}}
							disabled={isSending}
						>
							Konfirmasi Booking
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setSubject(`Informasi Pickup ${bookingNumber}`);
								setMessage(`Halo ${customerName},\n\nMengingatkan bahwa jadwal pickup Anda:\n- No. Booking: ${bookingNumber}\n- Kendaraan: ${vehicleName}\n- Tanggal: ${format(new Date(startDate), 'dd MMM yyyy')}\n- Waktu: 08:00 - 10:00 WIB\n- Lokasi: Kantor Savanna Bromo Rental\n\nHarap datang tepat waktu dan bawa identitas (KTP/SIM).\n\nSalam,\nSavanna Bromo Rental`);
							}}
							disabled={isSending}
						>
							Info Pickup
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setSubject(`Pengingat Return ${bookingNumber}`);
								setMessage(`Halo ${customerName},\n\nMengingatkan bahwa jadwal return Anda:\n- No. Booking: ${bookingNumber}\n- Kendaraan: ${vehicleName}\n- Tanggal: ${format(new Date(endDate), 'dd MMM yyyy')}\n\nMohon kembalikan kendaraan sesuai jadwal.\n\nSalam,\nSavanna Bromo Rental`);
							}}
							disabled={isSending}
						>
							Pengingat Return
						</Button>
					</div>
				</div>

				{/* Status Messages */}
				{success && (
					<div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">
						✅ {success}
					</div>
				)}
				{error && (
					<div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
						❌ {error}
					</div>
				)}

				{/* Send Button */}
				<div className="flex justify-end">
					<Button
						onClick={handleSendEmail}
						disabled={isSending || !customerEmail || !subject.trim() || !message.trim()}
					>
						<Send className="mr-2 size-4" />
						{sendEmail.isPending ? 'Mengirim...' : 'Kirim Email'}
					</Button>
				</div>
			</div>
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
	const [damageFeeOverride, setDamageFeeOverride] = useState('');
	const [conditionStatus, setConditionStatus] = useState('');
	const [actionError, setActionError] = useState('');

	const confirmBooking = useConfirmBooking();
	const startRental = useStartRental();
	const completeRental = useCompleteRental();
	const cancelBooking = useCancelBooking();
	const extendBooking = useExtendBooking();

	const handleAction = async () => {
		setActionError('');
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
						damageFeeOverride: damageFeeOverride ? Number(damageFeeOverride) : undefined,
						conditionStatus: (conditionStatus || undefined) as CompleteRentalRequest['conditionStatus'],
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
			setDamageFeeOverride('');
			setConditionStatus('');
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Action failed';
			setActionError(msg);
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
		(action.action === 'cancel' && reason.trim().length < 3) ||
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
							<FormField label="Alasan Cancel" required>
								<Textarea
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="Masukkan alasan pembatalan..."
									rows={3}
								/>
							</FormField>
						)}

						{actionError && (
							<div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
								{actionError}
							</div>
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

						{action.action === 'complete' && (
							<FormField label="Damage Fee Override (IDR)" hint="Override otomatis (flipped items × rate). Kosongkan untuk auto.">
								<Input
									type="number"
									value={damageFeeOverride}
									onChange={(e) => setDamageFeeOverride(e.target.value)}
									placeholder="e.g. 200000"
									min={0}
								/>
							</FormField>
						)}

						{action.action === 'complete' && (
							<FormField label="Vehicle Condition">
								<select
									value={conditionStatus}
									onChange={(e) => setConditionStatus(e.target.value)}
									className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
								>
									<option value="">Auto (derive from checklist)</option>
									<option value="Excellent">Excellent</option>
									<option value="Good">Good</option>
									<option value="Fair">Fair</option>
									<option value="Poor">Poor</option>
									<option value="Maintenance">Maintenance</option>
								</select>
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
						<Button variant="outline" onClick={() => { setOpen(false); setActionError(''); }} disabled={isLoading}>
							Tutup
						</Button>
						<Button
							variant={action.variant === 'destructive' ? 'destructive' : 'default'}
							onClick={handleAction}
							disabled={isSubmitDisabled}
						>
							{isLoading ? 'Memproses...' : action.label === 'Cancel' ? 'Batalkan Booking' : action.label}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}