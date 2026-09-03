import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { toast } from '@/react-app/hooks/useToast';
import { reportsApi } from '../api/reportsApi';
import type { DateRangeParams } from '../types/reports.types';

interface ExportButtonProps {
	reportType: 'revenue' | 'fleet-utilization' | 'payments' | 'customers';
	params?: DateRangeParams;
	disabled?: boolean;
}

export function ExportButton({ reportType, params, disabled }: ExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const blob = await reportsApi.exportCsv(reportType, params);

			// RPT-03: when there is no data for the selected period, the backend
			// returns a CSV with only headers (or a tiny body). Surface this to
			// the user instead of silently downloading an empty file.
			const text = await blob.text();
			const lineCount = text.trim().split('\n').length;
			if (lineCount <= 1) {
				toast({
					title: 'Tidak ada data untuk diekspor',
					description: 'Tidak ada record untuk periode terpilih.',
					variant: 'destructive',
				});
				return;
			}

			// Rebuild a Blob from the text and trigger a download.
			const downloadBlob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(downloadBlob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `${reportType}-report.csv`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast({ title: 'Ekspor selesai', description: 'File CSV telah diunduh.' });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Gagal mengekspor CSV';
			toast({ title: 'Ekspor gagal', description: message, variant: 'destructive' });
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<Button variant="outline" size="sm" onClick={handleExport} disabled={disabled || isExporting}>
			<Download className="mr-2 h-4 w-4" />
			{isExporting ? 'Mengekspor...' : 'Ekspor CSV'}
		</Button>
	);
}
