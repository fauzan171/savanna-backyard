import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import type { PeriodFilter } from '../types/dashboard.types';

interface PeriodFilterProps {
	value: PeriodFilter;
	onChange: (value: PeriodFilter) => void;
}

const periodOptions: { value: PeriodFilter; label: string }[] = [
	{ value: 'today', label: periodLabels.today },
	{ value: 'week', label: periodLabels.week },
	{ value: 'month', label: periodLabels.month },
	{ value: 'year', label: periodLabels.year },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as PeriodFilter)}>
			<SelectTrigger className="w-[150px]">
				<SelectValue placeholder="Pilih periode" />
			</SelectTrigger>
			<SelectContent>
				{periodOptions.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
import { periodLabels } from '@/react-app/lib/labels';
