import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const switchVariants = cva(
	'shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
	{
		variants: {
			size: {
				sm: 'h-5 w-9',
				md: 'h-6 w-11',
				lg: 'h-7 w-14',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	}
);

const switchThumbVariants = cva(
	'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
	{
		variants: {
			size: {
				sm: 'size-4 data-[state=checked]:translate-x-4',
				md: 'size-5 data-[state=checked]:translate-x-5',
				lg: 'size-6 data-[state=checked]:translate-x-7',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	}
);

export interface SwitchProps
	extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
		VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitive.Root>,
	SwitchProps
>(({ className, size, ...props }, ref) => (
	<SwitchPrimitive.Root
		className={cn(switchVariants({ size }), className)}
		{...props}
		ref={ref}
	>
		<SwitchPrimitive.Thumb className={cn(switchThumbVariants({ size }))} />
	</SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch, switchVariants, switchThumbVariants };
