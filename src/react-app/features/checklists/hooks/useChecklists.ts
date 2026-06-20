import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/react-app/lib/api-client';
import type { ApiSuccessResponse } from '@/react-app/features/shared/types/api.types';
import type {
  ChecklistResponse,
  ChecklistsByBooking,
  CreateChecklistRequest,
  UpdateChecklistRequest,
} from '../types/checklist.types';
import { bookingKeys } from '@/react-app/features/bookings/hooks/useBookings';

const BASE_PATH = '/v1/checklists';

// ============================================
// QUERY KEYS
// ============================================

export const checklistKeys = {
  all: ['checklists'],
  byBooking: (bookingId: string) => ['checklists', 'booking', bookingId],
  detail: (id: string) => ['checklists', 'detail', id],
};

// ============================================
// QUERY HOOKS
// ============================================

/** Get checklists by booking ID */
export function useChecklistsByBooking(bookingId: string) {
  return useQuery({
    queryKey: checklistKeys.byBooking(bookingId),
    queryFn: () =>
      api.get<ApiSuccessResponse<ChecklistsByBooking>>(`${BASE_PATH}/booking/${bookingId}`),
    select: (data) => data.data,
    enabled: !!bookingId,
  });
}

/** Get single checklist by ID */
export function useChecklist(id: string) {
  return useQuery({
    queryKey: checklistKeys.detail(id),
    queryFn: () =>
      api.get<ApiSuccessResponse<ChecklistResponse>>(`${BASE_PATH}/${id}`),
    select: (data) => data.data,
    enabled: !!id,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/** Create new checklist */
export function useCreateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChecklistRequest) =>
      api.post<ApiSuccessResponse<ChecklistResponse>>(BASE_PATH, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

/** Update existing checklist */
export function useUpdateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChecklistRequest }) =>
      api.patch<ApiSuccessResponse<ChecklistResponse>>(`${BASE_PATH}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.all });
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}
