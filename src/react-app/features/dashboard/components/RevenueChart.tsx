import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '@/react-app/components/ui/chart-container';
import type { RevenueStats } from '../types/dashboard.types';

interface RevenueChartProps {
	data: RevenueStats | undefined;
	isLoading: boolean;
}

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
	const chartData = (data?.trend ?? []).map((item) => ({
		date: new Date(item.date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		}),
		amount: item.amount,
		cumulative: item.cumulative,
	}));

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
			notation: 'compact',
		}).format(value);
	};

	return (
		<ChartContainer
			title="Revenue Trend"
			description={data?.period ? `Period: ${data.period}` : undefined}
			loading={isLoading}
			empty={!data?.trend || data.trend.length === 0}
			emptyMessage="No revenue data for the selected period"
		>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart data={chartData}>
					<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
					<XAxis
						dataKey="date"
						className="text-xs"
						tick={{ fill: 'hsl(var(--muted-foreground))' }}
						tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
					/>
					<YAxis
						className="text-xs"
						tick={{ fill: 'hsl(var(--muted-foreground))' }}
						tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
						tickFormatter={formatCurrency}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: 'hsl(var(--card))',
							border: '1px solid hsl(var(--border))',
							borderRadius: '8px',
							color: 'hsl(var(--card-foreground))',
						}}
						formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value), 'Revenue'] : ['', 'Revenue']}
					/>
					<Line
						type="monotone"
						dataKey="amount"
						stroke="hsl(var(--primary))"
						strokeWidth={2}
						dot={false}
						name="Daily Revenue"
					/>
				</LineChart>
			</ResponsiveContainer>
		</ChartContainer>
	);
}
