import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/react-app/components/ui/dialog';
import { Button } from '@/react-app/components/ui/button';
import { useScanReturn } from '../hooks/useBookings';
import type { ScanReturnResult } from '../types/booking.types';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const SCANNER_ID = 'qr-reader-admin';

export function QrScannerModal({ open, onOpenChange }: Props) {
	const navigate = useNavigate();
	const scannerRef = useRef<Html5QrcodeScanner | null>(null);
	const scanReturn = useScanReturn();
	const [result, setResult] = useState<ScanReturnResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [scanning, setScanning] = useState(false);

	const stopScanner = () => {
		if (scannerRef.current) {
			scannerRef.current.clear().catch(() => {});
			scannerRef.current = null;
		}
	};

	const reset = () => {
		setResult(null);
		setError(null);
		setScanning(false);
	};

	const handleScan = async (qrCode: string) => {
		if (scanning || result) return;
		setScanning(true);
		setError(null);
		try {
			const res = await scanReturn.mutateAsync(qrCode);
			setResult(res.data);
			stopScanner();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Gagal memproses QR code');
		} finally {
			setScanning(false);
		}
	};

	// Start/stop the camera scanner with the dialog open state
	useEffect(() => {
		if (!open) {
			stopScanner();
			reset();
			return;
		}
		if (result || error) return;

		const timer = setTimeout(() => {
			if (!document.getElementById(SCANNER_ID) || scannerRef.current) return;
			const scanner = new Html5QrcodeScanner(
				SCANNER_ID,
				{
					qrbox: { width: 240, height: 240 },
					fps: 5,
				},
				false,
			);
			scanner.render(
				(decoded) => { void handleScan(decoded); },
				() => { /* per-frame decode miss — ignore */ },
			);
			scannerRef.current = scanner;
		}, 120);

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, result, error]);

	const handleOpenBooking = () => {
		if (!result) return;
		onOpenChange(false);
		navigate(`/bookings/${result.bookingId}`);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					stopScanner();
					reset();
				}
				onOpenChange(o);
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<QrCode className="size-5" /> Scan QR Motor
					</DialogTitle>
					<DialogDescription>
						Arahkan kamera ke QR di motor untuk mencari rental aktif & memproses pengembalian.
					</DialogDescription>
				</DialogHeader>

				{error && (
					<div className="flex items-start gap-2 rounded-md bg-error/10 p-3 text-sm text-error">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<div className="flex-1">{error}</div>
						<Button size="sm" variant="ghost" onClick={reset}>Coba lagi</Button>
					</div>
				)}

				{result ? (
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-[hsl(var(--color-success))]">
							<CheckCircle2 className="size-5" />
							<span className="font-medium">Rental aktif ditemukan</span>
						</div>
						<div className="space-y-1 rounded-md border p-3 text-sm">
							<Row label="Booking" value={result.bookingNumber} />
							<Row label="Motor" value={result.vehicleName} />
							<Row label="Customer" value={result.customerName} />
							<Row label="Status" value={result.status} />
							<Row label="Periode" value={`${result.startDate} → ${result.endDate}`} />
						</div>
						<Button className="w-full" onClick={handleOpenBooking}>
							<ExternalLink className="mr-2 size-4" /> Buka Booking
						</Button>
					</div>
				) : (
					<div className="space-y-3">
						{scanning && (
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-4 animate-spin" /> Memverifikasi QR...
							</div>
						)}
						<div id={SCANNER_ID} className="min-h-[300px] overflow-hidden rounded-md bg-muted" />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right font-medium">{value}</span>
		</div>
	);
}
