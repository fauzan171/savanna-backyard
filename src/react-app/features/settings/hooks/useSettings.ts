import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';

export const settingsKeys = {
	all: ['settings'] as string[],
};

export function useSettings() {
	return useQuery({
		queryKey: settingsKeys.all,
		queryFn: async () => { const res = await settingsApi.list(); return res.data; },
	});
}

export function useBulkUpdateSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (settings: Array<{ key: string; value: string }>) => settingsApi.bulkUpdate(settings),
		onSuccess: () => qc.invalidateQueries({ queryKey: settingsKeys.all }),
	});
}
