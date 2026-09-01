import * as React from 'react';
import { cn } from '@/react-app/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const textareaVariants = cva(
	'flex w-full rounded-md border bg-background px-4 py-3 text-base ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'border-input',
				error: 'border-destructive focus-visible:ring-destructive',
			},
			size: {
				sm: 'min-h-[72px] text-sm',
				md: 'min-h-[104px]',
				lg: 'min-h-[120px] text-base',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
		},
	}
);

export interface TextareaProps
	extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
		VariantProps<typeof textareaVariants> {
	error?: string;
	hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, variant, size, error, hint, ...props }, ref) => {
		return (
			<div className="w-full">
				<textarea
					className={cn(
						textareaVariants({ variant: error ? 'error' : variant, size }),
						className
					)}
					ref={ref}
					{...props}
				/>
				{hint && !error && (
					<p className="mt-2 text-sm text-muted-foreground">{hint}</p>
				)}
				{error && <p className="mt-2 text-sm text-destructive">{error}</p>}
			</div>
		);
	}
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
