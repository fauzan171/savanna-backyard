import { useQuery } from '@tanstack/react-query';
import { otpApi } from '../api/otp';

export function useOtpLogs() {
	return useQuery({
		queryKey: ['otp-logs'],
		queryFn: async () => {
			const res = await otpApi.list();
			return res.data;
		},
		refetchInterval: 30_000,
	});
}
