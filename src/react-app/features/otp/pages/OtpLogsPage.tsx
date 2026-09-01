import { RefreshCw } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useOtpLogs } from '../hooks/useOtpLogs';

function formatDate(value: string) {
	return new Date(value).toLocaleString('id-ID', {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

function statusLabel(status: string) {
	switch (status) {
		case 'verified':
			return 'Terverifikasi';
		case 'expired':
			return 'Expired';
		default:
			return 'OTP dikirim';
	}
}

export default function OtpLogsPage() {
	const { data, isLoading, refetch, isFetching } = useOtpLogs();

	return (
		<div className="space-y-6">
			<PageHeader
				title="OTP Customer"
				description="Pantau OTP login customer yang dikirim sementara lewat web"
				actions={
					<Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
						<RefreshCw className={`size-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
				}
			/>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
				</div>
			) : (
				<div className="border rounded-lg overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-3 text-sm font-medium">Nomor WA</th>
								<th className="text-left p-3 text-sm font-medium">OTP</th>
								<th className="text-left p-3 text-sm font-medium">Ref</th>
								<th className="text-left p-3 text-sm font-medium">Channel</th>
								<th className="text-left p-3 text-sm font-medium">Status</th>
								<th className="text-left p-3 text-sm font-medium">Percobaan</th>
								<th className="text-left p-3 text-sm font-medium">Expired</th>
								<th className="text-left p-3 text-sm font-medium">Dibuat</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{(data ?? []).map((row) => (
								<tr key={row.id} className="hover:bg-muted/30">
									<td className="p-3 font-medium">{row.phone}</td>
									<td className="p-3 font-mono text-sm">{row.otpCode ?? '-'}</td>
									<td className="p-3 font-mono text-sm">{row.refCode}</td>
									<td className="p-3 text-sm uppercase">{row.deliveryChannel}</td>
									<td className="p-3 text-sm">{statusLabel(row.status)}</td>
									<td className="p-3 text-sm">{row.attempts}</td>
									<td className="p-3 text-sm">{formatDate(row.expiresAt)}</td>
									<td className="p-3 text-sm">{formatDate(row.createdAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
					{(!data || data.length === 0) && (
						<div className="text-center py-8 text-muted-foreground">
							Belum ada OTP yang dikirim.
						</div>
					)}
				</div>
			)}
		</div>
	);
}
