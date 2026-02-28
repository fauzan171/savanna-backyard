import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Inbox, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';

const emptyStateVariants = cva(
	'flex flex-col items-center justify-center text-center p-8',
	{
		variants: {
			size: {
				sm: 'py-6 px-4',
				md: 'py-10 px-6',
				lg: 'py-16 px-8',
			},
			variant: {
				default: '',
				muted: 'text-muted-foreground',
				error: 'text-destructive',
			},
		},
		defaultVariants: {
			size: 'md',
			variant: 'default',
		},
	}
);

const iconVariants = cva('mb-4 opacity-50', {
	variants: {
		size: {
			sm: 'size-10',
			md: 'size-14',
			lg: 'size-20',
		},
	},
	defaultVariants: {
		size: 'md',
	},
});

const defaultIcons = {
	'default': Inbox,
	'no-results': Search,
	'error': AlertCircle,
	'success': CheckCircle,
} as const;

export interface EmptyStateProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof emptyStateVariants> {
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Icon to display (defaults based on type) */
	icon?: React.ReactNode;
	/** Predefined type for default icon */
	type?: 'default' | 'no-results' | 'error' | 'success';
	/** Action button or element */
	action?: React.ReactNode;
}

/**
 * EmptyState displays a placeholder when there is no data to show.
 * Useful for empty tables, search results, or error states.
 */
function EmptyState({
	title,
	description,
	icon,
	type = 'default',
	action,
	size,
	variant,
	className,
	...props
}: EmptyStateProps) {
	const DefaultIcon = defaultIcons[type];

	return (
		<div className={cn(emptyStateVariants({ size, variant }), className)} {...props}>
			{icon ? (
				<div className={cn(iconVariants({ size }))}>{icon}</div>
			) : (
				<DefaultIcon className={cn(iconVariants({ size }))} />
			)}
			<h3 className="font-display text-lg font-semibold text-foreground mb-1">
				{title}
			</h3>
			{description && (
				<p className="text-sm text-muted-foreground max-w-sm mb-4">
					{description}
				</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}

export { EmptyState, emptyStateVariants };
