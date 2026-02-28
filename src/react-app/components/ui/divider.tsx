import * as React from 'react';
import { cn } from '@/react-app/lib/utils';

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
	orientation?: 'horizontal' | 'vertical';
	label?: string;
	dashed?: boolean;
}

function Divider({
	orientation = 'horizontal',
	label,
	dashed = false,
	className,
	...props
}: DividerProps) {
	const isHorizontal = orientation === 'horizontal';

	if (label && isHorizontal) {
		return (
			<div
				className={cn('flex items-center gap-4', className)}
				{...props}
			>
				<div
					className={cn(
						'flex-1 border-t border-border',
						dashed && 'border-dashed'
					)}
				/>
				<span className="text-xs text-muted-foreground font-medium">{label}</span>
				<div
					className={cn(
						'flex-1 border-t border-border',
						dashed && 'border-dashed'
					)}
				/>
			</div>
		);
	}

	return (
		<div
			role="separator"
			aria-orientation={orientation}
			className={cn(
				'shrink-0 border-border',
				isHorizontal ? 'w-full border-t' : 'h-full self-stretch border-l',
				dashed && 'border-dashed',
				className
			)}
			{...props}
		/>
	);
}

export { Divider };
export type { DividerProps };
