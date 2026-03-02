import {
	PieChart as RechartsPieChart,
	Pie,
	Cell,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from 'recharts';
import { ChartContainer } from '@/react-app/components/ui/chart-container';

interface PieChartProps {
	title: string;
	description?: string;
	data: Array<{
		name: string;
		value: number;
	}>;
	loading?: boolean;
	empty?: boolean;
	formatValue?: (value: number) => string;
}

const COLORS = [
	'hsl(var(--primary))',
	'hsl(217.2 91.2% 59.8%)',
	'hsl(142.1 76.2% 36.3%)',
	'hsl(262.1 83.3% 57.8%)',
	'hsl(24.6 95% 53.1%)',
	'hsl(349.7 89.2% 60.2%)',
	'hsl(199.4 95.5% 73.9%)',
	'hsl(160.1 84.1% 39.4%)',
];

export function PieChart({
	title,
	description,
	data,
	loading,
	empty,
	formatValue,
}: PieChartProps) {
	const format = formatValue ?? ((value: number) => value.toLocaleString());

    return (
        <ChartContainer
            title={title}
            description={description}
            loading={loading}
            empty={empty}
            emptyMessage="No data available for the selected period"
        >
            <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                        label={({ name, percent }) => {
                            const pct = percent ?? 0;
                            return `${name} ${pct.toFixed(0)}%`;
                        }}
                    >
                        {data.map((_entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--card-foreground))',
                        }}
                        formatter={(value: number | undefined) => {
                            if (value === undefined) return ['', ''];
                            return [format(value), ''];
                        }}
                    />
                    <Legend />
                </RechartsPieChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
}
