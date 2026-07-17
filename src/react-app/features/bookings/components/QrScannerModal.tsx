import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Loader2, CheckCircle2, AlertCircle, ExternalLink, Camera, Keyboard, RefreshCw } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/react-app/components/ui/dialog';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { useScanReturn } from '../hooks/useBookings';
import type { ScanReturnResult } from '../types/booking.types';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const SCANNER_ID = 'qr-reader-admin';

type ViewMode = 'permission' | 'scanner' | 'manual' | 'result' | 'error';

export function QrScannerModal({ open, onOpenChange }: Props) {
	const navigate = useNavigate();
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const scanReturn = useScanReturn();
	const [result, setResult] = useState<ScanReturnResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [scanning, setScanning] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>('permission');
	const [manualPlate, setManualPlate] = useState('');
	const [cameraPermission, setCameraPermission] = useState<PermissionState | null>(null);

	const stopScanner = useCallback(() => {
		if (scannerRef.current) {
			const scanner = scannerRef.current;
			scannerRef.current = null;
			scanner.stop().catch(() => {});
			scanner.clear();
		}
	}, []);

	const reset = useCallback(() => {
		setResult(null);
		setError(null);
		setScanning(false);
		setViewMode('permission');
		setManualPlate('');
	}, []);

	// Check camera permission on mount
	useEffect(() => {
		if (!open) return;

		const checkPermission = async () => {
			try {
				// Check if Permissions API is available
				if (navigator.permissions?.query) {
					const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
					setCameraPermission(status.state);

					if (status.state === 'granted') {
						setViewMode('scanner');
					} else if (status.state === 'prompt') {
						setViewMode('permission');
					} else {
						setViewMode('permission');
					}

					// Listen for permission changes
					status.onchange = () => {
						setCameraPermission(status.state);
						if (status.state === 'granted') {
							setViewMode('scanner');
						}
					};
				} else {
					// Permissions API not available, try to access camera directly
					setViewMode('permission');
				}
			} catch {
				setViewMode('permission');
			}
		};

		checkPermission();
	}, [open]);

	// Start scanner when viewMode is 'scanner'
	useEffect(() => {
		if (viewMode !== 'scanner' || !open) {
			return;
		}

		const timer = setTimeout(() => {
			startScanner();
		}, 200);

		return () => {
			clearTimeout(timer);
			stopScanner();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [viewMode, open]);

	const startScanner = async () => {
		const element = document.getElementById(SCANNER_ID);
		if (!element || scannerRef.current) return;

		try {
			const scanner = new Html5Qrcode(SCANNER_ID);
			scannerRef.current = scanner;

			await scanner.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0,
				},
				(decodedText) => {
					void handleScan(decodedText);
				},
				() => { /* ignore scan failures */ },
			);

			setScanning(true);
		} catch (err) {
			console.error('Scanner start error:', err);
			setError(
				err instanceof Error
					? `Camera error: ${err.message}`
					: 'Failed to start camera. Please check camera permissions.'
			);
			setViewMode('error');
		}
	};

	const requestCameraPermission = async () => {
		try {
			// Try to get camera access directly - this will prompt the user
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			});
			// Permission granted, stop this stream and let html5-qrcode handle it
			stream.getTracks().forEach((track) => track.stop());
			setCameraPermission('granted');
			setViewMode('scanner');
		} catch (err) {
			console.error('Permission request error:', err);
			if (err instanceof DOMException && err.name === 'NotAllowedError') {
				setError('Camera permission denied. Please allow camera access in your browser settings.');
			} else if (err instanceof DOMException && err.name === 'NotFoundError') {
				setError('No camera found on this device.');
			} else {
				setError('Unable to access camera. Please check your device settings.');
			}
			setViewMode('error');
		}
	};

	const handleScan = async (qrCode: string) => {
		if (scanning || result) return;
		setScanning(true);
		setError(null);
		try {
			const res = await scanReturn.mutateAsync(qrCode);
			setResult(res.data);
			setViewMode('result');
			stopScanner();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Gagal memproses QR code');
			setViewMode('error');
		} finally {
			setScanning(false);
		}
	};

	const handleManualSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!manualPlate.trim()) return;
		await handleScan(manualPlate.trim());
	};

	const handleOpenBooking = () => {
		if (!result) return;
		onOpenChange(false);
		navigate(`/bookings/${result.bookingId}`);
	};

	const handleClose = () => {
		stopScanner();
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<QrCode className="size-5" /> Scan QR Motor
					</DialogTitle>
					<DialogDescription>
						Arahkan kamera ke QR di motor untuk mencari rental aktif.
					</DialogDescription>
				</DialogHeader>

				{/* Permission View */}
				{viewMode === 'permission' && (
					<div className="space-y-4">
						<div className="flex flex-col items-center justify-center py-6 text-center">
							<div className="rounded-full bg-muted p-4 mb-4">
								<Camera className="size-8 text-muted-foreground" />
							</div>
							<h3 className="font-medium mb-2">Camera Access Required</h3>
							<p className="text-sm text-muted-foreground mb-4">
								We need camera access to scan QR codes on vehicles.
							</p>
							<Button onClick={requestCameraPermission} className="w-full">
								<Camera className="mr-2 size-4" /> Allow Camera Access
							</Button>
						</div>
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-background px-2 text-muted-foreground">or</span>
							</div>
						</div>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setViewMode('manual')}
						>
							<Keyboard className="mr-2 size-4" /> Enter Plate Number Manually
						</Button>
					</div>
				)}

				{/* Scanner View */}
				{viewMode === 'scanner' && (
					<div className="space-y-3">
						{scanning && (
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-4 animate-spin" /> Memindai QR...
							</div>
						)}
						<div id={SCANNER_ID} className="min-h-[300px] overflow-hidden rounded-md bg-muted" />
						<Button
							variant="outline"
							className="w-full"
							onClick={() => setViewMode('manual')}
						>
							<Keyboard className="mr-2 size-4" /> Enter Manually Instead
						</Button>
					</div>
				)}

				{/* Manual Input View */}
				{viewMode === 'manual' && (
					<div className="space-y-4">
						<form onSubmit={handleManualSubmit} className="space-y-3">
							<div>
								<label className="text-sm font-medium text-muted-foreground mb-1 block">
									Plate Number / QR Code
								</label>
								<Input
									type="text"
									placeholder="e.g. B 1234 SVK or SVN:vehicle-id"
									value={manualPlate}
									onChange={(e) => setManualPlate(e.target.value)}
									autoFocus
									className="font-mono text-lg"
								/>
							</div>
							<Button type="submit" className="w-full" disabled={!manualPlate.trim()}>
								{scanning ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<QrCode className="mr-2 size-4" />
								)}
								Search Booking
							</Button>
						</form>
						{cameraPermission !== 'denied' && (
							<Button
								variant="outline"
								className="w-full"
								onClick={() => setViewMode('scanner')}
							>
								<RefreshCw className="mr-2 size-4" /> Back to Camera
							</Button>
						)}
					</div>
				)}

				{/* Error View */}
				{viewMode === 'error' && error && (
					<div className="space-y-4">
						<div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							<AlertCircle className="mt-0.5 size-4 shrink-0" />
							<div className="flex-1">{error}</div>
						</div>
						<div className="flex gap-2">
							{cameraPermission !== 'denied' && (
								<Button
									variant="outline"
									className="flex-1"
									onClick={() => {
										setError(null);
										setViewMode('permission');
									}}
								>
									<RefreshCw className="mr-2 size-4" /> Try Again
								</Button>
							)}
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => {
									setError(null);
									setViewMode('manual');
								}}
							>
								<Keyboard className="mr-2 size-4" /> Enter Manually
							</Button>
						</div>
					</div>
				)}

				{/* Result View */}
				{viewMode === 'result' && result && (
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
