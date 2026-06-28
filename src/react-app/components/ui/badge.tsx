import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const badgeVariants = cva(
	'inline-flex items-center gap-1.5 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	{
		variants: {
			variant: {
				default: 'bg-muted text-muted-foreground',
				success:
					'bg-[hsl(var(--color-success-bg))] text-[hsl(var(--color-success))] border border-[hsl(var(--color-success-border))]',
				warning:
					'bg-[hsl(var(--color-warning-bg))] text-[hsl(var(--color-warning))] border border-[hsl(var(--color-warning-border))]',
				error:
					'bg-[hsl(var(--color-error-bg))] text-[hsl(var(--color-error))] border border-[hsl(var(--color-error-border))]',
				info:
					'bg-[hsl(var(--color-info-bg))] text-[hsl(var(--color-info))] border border-[hsl(var(--color-info-border))]',
				outline: 'border border-border text-foreground bg-background',
				primary: 'bg-primary/10 text-primary border border-primary/20',
			},
			size: {
				sm: 'px-2 py-0.5 text-[10px]',
				md: 'px-2.5 py-1 text-xs',
				lg: 'px-3 py-1.5 text-sm',
				xl: 'px-4 py-2 text-base',
			},
			shape: {
				rounded: 'rounded-md',
				pill: 'rounded-full',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
			shape: 'rounded',
		},
	}
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {
	asChild?: boolean;
}

function Badge({ className, variant, size, shape, ...props }: BadgeProps) {
	return (
		<span className={cn(badgeVariants({ variant, size, shape }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
