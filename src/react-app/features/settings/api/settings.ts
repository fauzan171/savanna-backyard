import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface Setting {
	key: string;
	value: string;
	description: string | null;
}

const BASE_PATH = '/v1/settings';

export const settingsApi = {
	list: async () => api.get<ApiSuccessResponse<Setting[]>>(BASE_PATH),
	getByKey: async (key: string) => api.get<ApiSuccessResponse<Setting>>(`${BASE_PATH}/${key}`),
	bulkUpdate: async (settings: Array<{ key: string; value: string }>) => api.patch<ApiSuccessResponse<Setting[]>>(BASE_PATH, { settings }),
	updateByKey: async (key: string, value: string) => api.patch<ApiSuccessResponse<Setting>>(`${BASE_PATH}/${key}`, { value }),
};
