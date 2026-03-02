import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';
import { Card, CardHeader, CardContent } from './card';
import { Skeleton } from './skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const statCardVariants = cva('', {
	variants: {
		size: {
			sm: 'p-4',
			md: 'p-6',
			lg: 'p-8',
		},
	},
	defaultVariants: {
		size: 'md',
	},
});

export interface StatCardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof statCardVariants> {
	title: string;
	value: string | number;
	icon?: React.ReactNode;
	trend?: {
		value: number;
		direction: 'up' | 'down' | 'neutral';
		label?: string;
	};
	description?: string;
	loading?: boolean;
}

function StatCard({
	title,
	value,
	icon,
	trend,
	description,
	loading,
	size,
	className,
	...props
}: StatCardProps) {
	return (
		<Card className={cn(statCardVariants({ size }), className)} {...props}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-2">
				<span className="text-sm font-medium text-muted-foreground">{title}</span>
				{icon && <div className="text-muted-foreground">{icon}</div>}
			</CardHeader>
			<CardContent className="p-0">
				{loading ? (
					<Skeleton className="h-8 w-24" />
				) : (
					<div className="text-2xl font-bold">{value}</div>
				)}
				{(trend || description) && (
					<div className="mt-1 flex items-center gap-1 text-xs">
						{trend && !loading && (
							<>
								{trend.direction === 'up' && (
									<TrendingUp className="h-3 w-3 text-green-500" />
								)}
								{trend.direction === 'down' && (
									<TrendingDown className="h-3 w-3 text-red-500" />
								)}
								{trend.direction === 'neutral' && (
									<Minus className="h-3 w-3 text-muted-foreground" />
								)}
								<span
									className={cn(
										trend.direction === 'up' && 'text-green-500',
										trend.direction === 'down' && 'text-red-500',
										trend.direction === 'neutral' && 'text-muted-foreground'
									)}
								>
									{trend.value > 0 ? '+' : ''}
									{trend.value}%
								</span>
								{trend.label && (
									<span className="text-muted-foreground">{trend.label}</span>
								)}
							</>
						)}
						{description && !trend && (
							<span className="text-muted-foreground">{description}</span>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export { StatCard, statCardVariants };
