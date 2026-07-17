import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, Printer } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/react-app/components/ui/dialog';

interface VehicleQrCardProps {
	vehicleId: string;
	vehicleName: string;
}

/**
 * Client-side QR generator for a vehicle. Encodes the compact `SVN:{vehicleId}`
 * form, which the customer ScanPage (savana) decodes. No backend endpoint — the
 * QR is just an identifier printed and attached to the bike.
 *
 * The QR includes a white margin around the code so it isn't too tight when
 * printed or downloaded, and the download PNG includes a visible white border.
 */
export function VehicleQrCard({ vehicleId, vehicleName }: VehicleQrCardProps) {
	const [open, setOpen] = useState(false);
	const canvasWrapRef = useRef<HTMLDivElement>(null);
	const qrValue = `SVN:${vehicleId}`;

	const getCanvasDataUrl = (): string | null => {
		const canvas = canvasWrapRef.current?.querySelector('canvas');
		return canvas ? canvas.toDataURL('image/png') : null;
	};

	const downloadPng = () => {
		const url = getCanvasDataUrl();
		if (!url) return;
		const a = document.createElement('a');
		a.href = url;
		a.download = `qr-${vehicleName.replace(/\s+/g, '-').toLowerCase()}.png`;
		a.click();
	};

	const printQr = () => {
		const url = getCanvasDataUrl();
		if (!url) return;
		const w = window.open('', '_blank', 'width=520,height=680');
		if (!w) return;
		w.document.write(`
			<html><head><title>QR - ${vehicleName}</title></head>
			<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;background:#fff">
				<h2 style="margin:0 0 16px">${vehicleName}</h2>
				<img src="${url}" width="320" height="320" alt="QR code" style="border:12px solid #fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1)" />
				<p style="font-family:monospace;color:#555;margin-top:12px">${qrValue}</p>
				<p style="color:#888;font-size:12px">Savanna Bromo — Scan to confirm pickup</p>
			</body></html>
		`);
		w.document.close();
		w.focus();
		w.print();
	};

	return (
		<>
			<Button variant="outline" onClick={() => setOpen(true)}>
				<QrCode className="size-4 mr-2" />
				Generate QR
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Vehicle QR Code</DialogTitle>
						<DialogDescription>
							Print and attach this QR to {vehicleName}. Customers scan it on pickup day to confirm they received the bike.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col items-center gap-4 py-2">
						<div ref={canvasWrapRef} className="rounded-xl border bg-white p-6 shadow-sm">
							<QRCodeCanvas value={qrValue} size={240} level="M" includeMargin={true} />
						</div>
						<p className="text-xs text-muted-foreground font-mono break-all">{qrValue}</p>

						<div className="flex gap-2">
							<Button variant="outline" onClick={downloadPng}>
								<Download className="size-4 mr-2" />
								Download PNG
							</Button>
							<Button onClick={printQr}>
								<Printer className="size-4 mr-2" />
								Print
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
