import { useApiQuery } from '@/react-app/features/shared/hooks/useApi';
import type { CalendarMatrixResult, CalendarMatrixFilters } from '../types/calendar.types';

export const calendarKeys = {
	all: ['calendar'] as string[],
	matrix: (filters: CalendarMatrixFilters) => ['calendar', 'matrix', filters] as string[],
};

export function useCalendarMatrix(filters: CalendarMatrixFilters) {
	const params: Record<string, string> = { month: filters.month };
	if (filters.type) params.type = filters.type;
	if (filters.status) params.status = filters.status;

	return useApiQuery<CalendarMatrixResult>(
		calendarKeys.matrix(filters),
		'/v1/vehicles/calendar',
		params,
	);
}
