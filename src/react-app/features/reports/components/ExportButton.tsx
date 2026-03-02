import { Download } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { reportsApi } from '../api/reportsApi';
import type { DateRangeParams } from '../types/reports.types';

interface ExportButtonProps {
	reportType: 'revenue' | 'fleet-utilization' | 'lead-sources' | 'payments' | 'customers';
	params?: DateRangeParams;
	disabled?: boolean;
}

export function ExportButton({ reportType, params, disabled }: ExportButtonProps) {
	const handleExport = () => {
		const url = reportsApi.getExportUrl(reportType, params);
		window.open(url, '_blank');
	};

	return (
		<Button variant="outline" size="sm" onClick={handleExport} disabled={disabled}>
			<Download className="mr-2 h-4 w-4" />
			Export CSV
		</Button>
	);
}
