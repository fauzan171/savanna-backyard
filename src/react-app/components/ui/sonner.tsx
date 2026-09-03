import { useToast } from '@/react-app/hooks/useToast';
import { X } from 'lucide-react';

export function Toaster() {
	const { toasts, dismiss } = useToast();

	// z-[100]: Radix Dialog portals render at z-50 after this element in DOM order.
	// Same z-index => toasts fired while a dialog is open (vehicle/customer create)
	// render hidden behind the modal overlay. Keep toasts above all dialogs.
	return (
		<div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`rounded-lg border px-4 py-3 shadow-lg transition-all ${
						toast.variant === 'destructive'
							? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-900/50 dark:text-red-100'
							: 'border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
					}`}
				>
					<div className="flex items-start gap-3">
						{toast.title && <div className="font-semibold">{toast.title}</div>}
						{toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
						<button
							onClick={() => dismiss(toast.id)}
							className="ml-auto shrink-0 rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
