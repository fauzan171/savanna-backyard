import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const labelVariants = cva(
	'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 transition-colors'
);

export interface LabelProps
	extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
		VariantProps<typeof labelVariants> {
	required?: boolean;
}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
	({ className, required, children, ...props }, ref) => (
		<LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
			{children}
			{required && <span className="ml-1 text-destructive">*</span>}
		</LabelPrimitive.Root>
	)
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
