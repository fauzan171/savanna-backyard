import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
  ChecklistResponse,
  ChecklistsByBooking,
  CreateChecklistRequest,
  UpdateChecklistRequest,
} from '../types/checklist.types';

const BASE_PATH = '/v1/checklists';

export const checklistApi = {
  /** Get checklists by booking ID (returns pickup + return) */
  getByBookingId: async (bookingId: string) => {
    return api.get<ApiSuccessResponse<ChecklistsByBooking>>(`${BASE_PATH}/booking/${bookingId}`);
  },

  /** Get single checklist by ID */
  getById: async (id: string) => {
    return api.get<ApiSuccessResponse<ChecklistResponse>>(`${BASE_PATH}/${id}`);
  },

  /** Create new checklist */
  create: async (data: CreateChecklistRequest) => {
    return api.post<ApiSuccessResponse<ChecklistResponse>>(BASE_PATH, data);
  },

  /** Update existing checklist */
  update: async (id: string, data: UpdateChecklistRequest) => {
    return api.patch<ApiSuccessResponse<ChecklistResponse>>(`${BASE_PATH}/${id}`, data);
  },
};
