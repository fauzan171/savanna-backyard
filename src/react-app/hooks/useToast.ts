import { create } from 'zustand';

export interface Toast {
	id: string;
	title?: string;
	description?: string;
	variant?: 'default' | 'destructive';
}

interface ToastState {
	toasts: Toast[];
	addToast: (toast: Omit<Toast, 'id'>) => void;
	dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
	toasts: [],
	addToast: (toast) => {
		const id = crypto.randomUUID();
		set((state) => ({
			toasts: [...state.toasts, { ...toast, id }],
		}));

		// Auto dismiss after 5 seconds
		setTimeout(() => {
			set((state) => ({
				toasts: state.toasts.filter((t) => t.id !== id),
			}));
		}, 5000);
	},
	dismiss: (id) => {
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		}));
	},
}));

// Convenience function
export function toast(props: Omit<Toast, 'id'>) {
	useToast.getState().addToast(props);
}
