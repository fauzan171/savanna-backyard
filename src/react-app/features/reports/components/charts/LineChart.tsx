import {
	LineChart as RechartsLineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from 'recharts';
import { ChartContainer } from '@/react-app/components/ui/chart-container';

interface LineChartProps {
	title: string;
	description?: string;
	data: Array<Record<string, unknown>>;
	xKey: string;
	lines: Array<{
		dataKey: string;
		name: string;
		color?: string;
	}>;
	loading?: boolean;
	empty?: boolean;
	formatY?: (value: number) => string;
}

const defaultColors = [
	'hsl(var(--primary))',
	'hsl(217.2 91.2% 59.8%)',
	'hsl(142.1 76.2% 36.3%)',
	'hsl(262.1 83.3% 57.8%)',
];

export function LineChart({
	title,
	description,
	data,
	xKey,
	lines,
	loading,
	empty,
	formatY,
}: LineChartProps) {
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
				<RechartsLineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
					{lines.map((line, index) => (
						<Line
							key={line.dataKey}
							type="monotone"
							dataKey={line.dataKey}
							name={line.name}
							stroke={line.color ?? defaultColors[index % defaultColors.length]}
							strokeWidth={2}
							dot={false}
						/>
					))}
				</RechartsLineChart>
			</ResponsiveContainer>
		</ChartContainer>
	);
}
