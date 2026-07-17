import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type { CalendarMatrixResult, CalendarMatrixFilters } from '../types/calendar.types';

const BASE_PATH = '/v1/vehicles';

export const calendarApi = {
	getMatrix: async (filters: CalendarMatrixFilters) => {
		const params: Record<string, string> = { month: filters.month };
		if (filters.type) params.type = filters.type;
		if (filters.status) params.status = filters.status;
		return api.get<ApiSuccessResponse<CalendarMatrixResult>>(`${BASE_PATH}/calendar`, params);
	},
};
