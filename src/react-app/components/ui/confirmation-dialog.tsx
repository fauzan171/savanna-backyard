import * as React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/react-app/components/ui/dialog';
import { Button } from '@/react-app/components/ui/button';
import { cn } from '@/react-app/lib/utils';

export interface ConfirmationDialogProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;
	/** Dialog title */
	title: string;
	/** Dialog description */
	description?: string;
	/** Confirm button label */
	confirmLabel?: string;
	/** Cancel button label */
	cancelLabel?: string;
	/** Visual variant */
	variant?: 'default' | 'danger' | 'warning';
	/** Callback when confirmed */
	onConfirm: () => void | Promise<void>;
	/** Show loading state */
	isLoading?: boolean;
	/** Additional content below description */
	children?: React.ReactNode;
}

const variantConfig = {
	default: {
		icon: Info,
		iconClass: 'text-sky-blue',
		confirmVariant: 'default' as const,
	},
	danger: {
		icon: AlertTriangle,
		iconClass: 'text-destructive',
		confirmVariant: 'destructive' as const,
	},
	warning: {
		icon: AlertCircle,
		iconClass: 'text-[hsl(var(--color-warning))]',
		confirmVariant: 'default' as const,
	},
};

/**
 * ConfirmationDialog is a pre-configured dialog for confirming actions.
 * Use for destructive actions like delete, or important decisions.
 */
function ConfirmationDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	variant = 'default',
	onConfirm,
	isLoading = false,
	children,
}: ConfirmationDialogProps) {
	const config = variantConfig[variant];
	const Icon = config.icon;

	const handleConfirm = async () => {
		await onConfirm();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="sm" className="sm:max-w-md">
				<DialogHeader>
					<div className="flex items-start gap-4">
						<div className={cn('mt-0.5 flex-shrink-0', config.iconClass)}>
							<Icon className="size-6" />
						</div>
						<div className="flex-1">
							<DialogTitle>{title}</DialogTitle>
							{description && (
								<DialogDescription className="mt-2">
									{description}
								</DialogDescription>
							)}
						</div>
					</div>
				</DialogHeader>
				{children && <div className="py-2">{children}</div>}
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						{cancelLabel}
					</Button>
					<Button
						variant={config.confirmVariant}
						onClick={handleConfirm}
						disabled={isLoading}
					>
						{isLoading ? 'Processing...' : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export { ConfirmationDialog };
