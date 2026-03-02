import {
	BarChart as RechartsBarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from 'recharts';
import { ChartContainer } from '@/react-app/components/ui/chart-container';

interface BarChartProps {
	title: string;
	description?: string;
	data: Array<Record<string, unknown>>;
	xKey: string;
	bars: Array<{
		dataKey: string;
		name: string;
		color?: string;
	}>;
	loading?: boolean;
	empty?: boolean;
	layout?: 'horizontal' | 'vertical';
	formatY?: (value: number) => string;
}

const defaultColors = [
	'hsl(var(--primary))',
	'hsl(217.2 91.2% 59.8%)',
	'hsl(142.1 76.2% 36.3%)',
	'hsl(262.1 83.3% 57.8%)',
	'hsl(24.6 95% 53.1%)',
];

export function BarChart({
	title,
	description,
	data,
	xKey,
	bars,
	loading,
	empty,
	formatY,
	layout = 'horizontal',
}: BarChartProps) {
	const formatValue = formatY ?? ((value: number) => value.toLocaleString());

	return (
		<ChartContainer
			title={title}
			description={description}
			loading={loading}
			empty={empty}
			emptyMessage="No data available for the selected period"
		>
			<ResponsiveContainer width="100%" height={300}>
				<RechartsBarChart data={data} layout={layout}>
					<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
					{layout === 'horizontal' ? (
						<>
							<XAxis
								dataKey={xKey}
								className="text-xs"
								tick={{ fill: 'hsl(var(--muted-foreground))' }}
								tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
							/>
							<YAxis
								className="text-xs"
								tick={{ fill: 'hsl(var(--muted-foreground))' }}
								tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
								tickFormatter={formatValue}
							/>
						</>
					) : (
						<>
							<XAxis
								type="number"
								className="text-xs"
								tick={{ fill: 'hsl(var(--muted-foreground))' }}
								tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
								tickFormatter={formatValue}
								width={100}
							/>
							<YAxis
								dataKey={xKey}
								type="category"
								className="text-xs"
								tick={{ fill: 'hsl(var(--muted-foreground))' }}
								tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
							/>
						</>
					)}
					<Tooltip
						contentStyle={{
							backgroundColor: 'hsl(var(--card))',
							border: '1px solid hsl(var(--border))',
							borderRadius: '8px',
							color: 'hsl(var(--card-foreground))',
						}}
						formatter={(value: number | undefined) => {
							if (value === undefined) return ['', ''];
                            return [formatValue(value), ''];
                        }}
					/>
					<Legend />
					{bars.map((bar, index) => (
						<Bar
							key={bar.dataKey}
							dataKey={bar.dataKey}
							name={bar.name}
							fill={bar.color ?? defaultColors[index % defaultColors.length]}
							radius={[4, 4, 0, 0]}
						/>
					))}
				</RechartsBarChart>
			</ResponsiveContainer>
		</ChartContainer>
	);
}
