import { RefreshCw } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useOtpLogs } from '../hooks/useOtpLogs';
import type { OtpLog } from '../api/otp';

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

function OtpCode({ value }: { value: string | null }) {
	return (
		<span className="inline-flex rounded-md border bg-muted px-2.5 py-1 font-mono text-base font-bold tracking-wider">
			{value ?? '-'}
		</span>
	);
}

function OtpMobileCard({ row }: { row: OtpLog }) {
	return (
		<div className="rounded-lg border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs text-muted-foreground">Nomor WA Customer</p>
					<p className="font-semibold">{row.phone}</p>
				</div>
				<OtpCode value={row.otpCode} />
			</div>
			<div className="mt-4 grid grid-cols-2 gap-3 text-sm">
				<div>
					<p className="text-xs text-muted-foreground">Ref</p>
					<p className="font-mono font-medium">{row.refCode}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Status</p>
					<p className="font-medium">{statusLabel(row.status)}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Channel</p>
					<p className="font-medium uppercase">{row.deliveryChannel}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Percobaan</p>
					<p className="font-medium">{row.attempts}</p>
				</div>
			</div>
			<div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
				Expired: {formatDate(row.expiresAt)} · Dibuat: {formatDate(row.createdAt)}
			</div>
		</div>
	);
}

export default function OtpLogsPage() {
	const { data, isLoading, refetch, isFetching } = useOtpLogs();
	const sentCount = data?.length ?? 0;
	const activeCount = data?.filter((row) => row.status === 'otp_sent').length ?? 0;

	return (
		<div className="space-y-6">
			<PageHeader
				title="OTP Customer"
				description="Semua kode OTP login customer yang dibuat lewat web sementara akan muncul di sini"
				actions={
					<Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
						<RefreshCw className={`size-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
				}
			/>

			<div className="grid gap-3 sm:grid-cols-3">
				<div className="rounded-lg border bg-card p-4">
					<p className="text-xs text-muted-foreground">Total OTP</p>
					<p className="mt-1 text-2xl font-bold">{sentCount}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<p className="text-xs text-muted-foreground">Masih Aktif</p>
					<p className="mt-1 text-2xl font-bold">{activeCount}</p>
				</div>
				<div className="rounded-lg border bg-card p-4">
					<p className="text-xs text-muted-foreground">Mode</p>
					<p className="mt-1 text-lg font-semibold">Web OTP</p>
				</div>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
				</div>
			) : (
				<>
				<div className="space-y-3 md:hidden">
					{(data ?? []).map((row) => (
						<OtpMobileCard key={row.id} row={row} />
					))}
				</div>
				<div className="hidden border rounded-lg overflow-x-auto md:block">
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
									<td className="p-3"><OtpCode value={row.otpCode} /></td>
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
				{(!data || data.length === 0) && (
					<div className="rounded-lg border p-6 text-center text-sm text-muted-foreground md:hidden">
						Belum ada OTP yang dikirim.
					</div>
				)}
				</>
			)}
		</div>
	);
}
