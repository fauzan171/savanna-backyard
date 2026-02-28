import * as React from 'react';
import { Button, type ButtonProps } from '@/react-app/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/react-app/components/ui/tooltip';
import { cn } from '@/react-app/lib/utils';

export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
	/** The icon to display */
	icon: React.ReactNode;
	/** Accessible label for the button */
	label: string;
	/** Size variant */
	size?: 'sm' | 'md' | 'lg';
	/** Show tooltip on hover */
	showTooltip?: boolean;
	/** Tooltip side */
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

const sizeMap = {
	sm: 'h-8 w-8',
	md: 'h-10 w-10',
	lg: 'h-11 w-11',
} as const;

/**
 * IconButton is a button that displays only an icon.
 * It wraps the Button component with icon-specific sizing and optional tooltip.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
	(
		{
			icon,
			label,
			size = 'md',
			showTooltip = true,
			tooltipSide = 'top',
			className,
			variant = 'ghost',
			...props
		},
		ref
	) => {
		const button = (
			<Button
				ref={ref}
				variant={variant}
				className={cn(sizeMap[size], 'p-0', className)}
				aria-label={label}
				{...props}
			>
				{icon}
			</Button>
		);

		if (!showTooltip) {
			return button;
		}

		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent side={tooltipSide}>{label}</TooltipContent>
			</Tooltip>
		);
	}
);
IconButton.displayName = 'IconButton';

export { IconButton };
