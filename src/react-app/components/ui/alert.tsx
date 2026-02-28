import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';

const alertVariants = cva(
	'relative w-full rounded-lg border p-4 transition-all duration-200',
	{
		variants: {
			variant: {
				info: 'bg-[hsl(var(--color-info-bg))] border-[hsl(var(--color-info-border))] text-[hsl(var(--color-info))]',
				success: 'bg-[hsl(var(--color-success-bg))] border-[hsl(var(--color-success-border))] text-[hsl(var(--color-success))]',
				warning: 'bg-[hsl(var(--color-warning-bg))] border-[hsl(var(--color-warning-border))] text-[hsl(var(--color-warning))]',
				error: 'bg-[hsl(var(--color-error-bg))] border-[hsl(var(--color-error-border))] text-[hsl(var(--color-error))]',
			},
		},
		defaultVariants: {
			variant: 'info',
		},
	}
);

const iconMap = {
	info: Info,
	success: CheckCircle,
	warning: AlertTriangle,
	error: AlertCircle,
};

export interface AlertProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof alertVariants> {
	title?: string;
	description?: string;
	dismissible?: boolean;
	onDismiss?: () => void;
	action?: React.ReactNode;
	hideIcon?: boolean;
}

function Alert({
	className,
	variant = 'info',
	title,
	description,
	dismissible = false,
	onDismiss,
	action,
	hideIcon = false,
	children,
	...props
}: AlertProps) {
	const Icon = iconMap[variant || 'info'];

	return (
		<div
			role="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		>
			<div className="flex gap-3">
				{!hideIcon && (
					<div className="flex-shrink-0 mt-0.5">
						<Icon className="size-5" />
					</div>
				)}
				<div className="flex-1 min-w-0">
					{title && (
						<h5 className="font-semibold text-sm mb-1">{title}</h5>
					)}
					{description && (
						<p className="text-sm opacity-90">{description}</p>
					)}
					{children}
					{action && (
						<div className="mt-3">{action}</div>
					)}
				</div>
				{dismissible && onDismiss && (
					<button
						type="button"
						className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
						onClick={onDismiss}
						aria-label="Dismiss"
					>
						<X className="size-4" />
					</button>
				)}
			</div>
		</div>
	);
}

export { Alert, alertVariants };
