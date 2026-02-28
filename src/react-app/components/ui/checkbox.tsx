import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const checkboxVariants = cva(
	'shrink-0 rounded-sm border border-primary ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary',
	{
		variants: {
			size: {
				sm: 'size-4',
				md: 'size-5',
				lg: 'size-6',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	}
);

export interface CheckboxProps
	extends Omit<React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>, 'checked'>,
		VariantProps<typeof checkboxVariants> {
	checked?: boolean | 'indeterminate';
}

const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	CheckboxProps
>(({ className, size, checked, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		checked={checked === 'indeterminate' ? 'indeterminate' : checked}
		className={cn(checkboxVariants({ size }), className)}
		{...props}
	>
		<CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
			{checked === 'indeterminate' ? (
				<Minus className="size-3.5" />
			) : (
				<Check className="size-3.5" />
			)}
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox, checkboxVariants };
