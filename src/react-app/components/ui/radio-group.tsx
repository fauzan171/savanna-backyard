import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const radioGroupVariants = cva('grid gap-2', {
	variants: {
		orientation: {
			vertical: 'grid-flow-row',
			horizontal: 'grid-flow-col',
		},
	},
	defaultVariants: {
		orientation: 'vertical',
	},
});

const RadioGroup = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> &
		VariantProps<typeof radioGroupVariants>
>(({ className, orientation, ...props }, ref) => {
	return (
		<RadioGroupPrimitive.Root
			className={cn(radioGroupVariants({ orientation }), className)}
			{...props}
			ref={ref}
		/>
	);
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const radioGroupItemVariants = cva(
	'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
	{
		variants: {
			size: {
				sm: 'h-3.5 w-3.5',
				md: 'h-4 w-4',
				lg: 'h-5 w-5',
			},
		},
		defaultVariants: {
			size: 'md',
		},
	}
);

const RadioGroupItem = React.forwardRef<
	React.ElementRef<typeof RadioGroupPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> &
		VariantProps<typeof radioGroupItemVariants>
>(({ className, size, ...props }, ref) => {
	const indicatorSize = size === 'sm' ? 'size-2' : size === 'lg' ? 'size-3' : 'size-2.5';

	return (
		<RadioGroupPrimitive.Item
			ref={ref}
			className={cn(radioGroupItemVariants({ size }), className)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
				<Circle className={cn(indicatorSize, 'fill-current text-current')} />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	);
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// ============================================
// RADIO OPTION (with label and description)
// ============================================

export interface RadioOptionProps {
	value: string;
	label: string;
	description?: string;
	disabled?: boolean;
}

function RadioOption({ value, label, description, disabled }: RadioOptionProps) {
	return (
		<label
			className={cn(
				'flex items-start gap-3 cursor-pointer rounded-md border border-border p-3 transition-colors',
				'hover:bg-muted',
				'has-[:checked]:border-primary has-[:checked]:bg-primary/5',
				disabled && 'opacity-50 cursor-not-allowed'
			)}
		>
			<RadioGroupItem value={value} disabled={disabled} className="mt-0.5" />
			<div className="flex-1">
				<div className="text-sm font-medium">{label}</div>
				{description && (
					<div className="text-xs text-muted-foreground mt-0.5">{description}</div>
				)}
			</div>
		</label>
	);
}

export {
	RadioGroup,
	RadioGroupItem,
	RadioOption,
	radioGroupVariants,
	radioGroupItemVariants,
};
