import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';

export interface OtpLog {
	id: string;
	phone: string;
	refCode: string;
	otpCode: string | null;
	deliveryChannel: 'web' | 'whatsapp';
	status: 'otp_sent' | 'verified' | 'expired';
	consumed: boolean;
	attempts: number;
	expiresAt: string;
	createdAt: string;
}

export const otpApi = {
	list: async () => api.get<ApiSuccessResponse<OtpLog[]>>('/v1/otp'),
};
