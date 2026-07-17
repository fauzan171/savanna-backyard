import { Badge } from '@/react-app/components/ui/badge';
import { Button } from '@/react-app/components/ui/button';
import { Spinner } from '@/react-app/components/ui/spinner';
import { usePenalties, useMarkPenaltyPaid } from '../hooks/useBookings';

const formatIDR = (n: number) =>
	new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0,
	}).format(n ?? 0);

export function PenaltyPanel({ bookingId }: { bookingId: string }) {
	const { data, isLoading } = usePenalties(bookingId);
	const markPaid = useMarkPenaltyPaid();

	if (isLoading) {
		return (
			<div className="flex justify-center py-4">
				<Spinner size="sm" />
			</div>
		);
	}

	if (!data || data.totalPenalty <= 0) {
		return (
			<div className="rounded-lg border p-4 text-sm text-muted-foreground">
				No penalties recorded for this booking.
			</div>
		);
	}

	return (
		<div className="rounded-lg border p-4 space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-semibold">Penalties</h4>
				<Badge variant={data.penaltyPaid ? 'success' : 'warning'}>
					{data.penaltyPaid ? 'Paid' : 'Unpaid'}
				</Badge>
			</div>

			<div className="space-y-1.5 text-sm">
				<Row label="Late fee" value={formatIDR(data.lateFee)} hint={data.lateFeeDetails?.calculation} />
				<Row
					label="Damage fee"
					value={formatIDR(data.damageFee)}
					hint={data.damageFeeDetails?.calculation}
				/>
				<div className="flex items-center justify-between border-t pt-2 font-medium">
					<span>Total penalty</span>
					<span>{formatIDR(data.totalPenalty)}</span>
				</div>
			</div>

			{!data.penaltyPaid && (
				<Button
					size="sm"
					onClick={() => markPaid.mutate(bookingId)}
					disabled={markPaid.isPending}
				>
					{markPaid.isPending ? 'Memproses...' : 'Mark penalty as paid'}
				</Button>
			)}
		</div>
	);
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<span>{label}</span>
				{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
			</div>
			<span>{value}</span>
		</div>
	);
}
