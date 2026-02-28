import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/react-app/components/ui/card';
import { cn } from '@/react-app/lib/utils';

interface Trend {
	value: number;
	direction: 'up' | 'down' | 'neutral';
	label?: string;
}

interface StatCardProps {
	value: string | number;
	label: string;
	trend?: Trend;
	icon?: React.ReactNode;
	prefix?: string;
	suffix?: string;
	variant?: 'default' | 'compact';
	className?: string;
	onClick?: () => void;
}

function StatCard({
	value,
	label,
	trend,
	icon,
	prefix,
	suffix,
	variant = 'default',
	className,
	onClick,
}: StatCardProps) {
	const formatValue = () => {
		if (typeof value === 'number') {
			return value.toLocaleString('id-ID');
		}
		return value;
	};

	const getTrendIcon = () => {
		if (!trend) return null;
		switch (trend.direction) {
			case 'up':
				return <TrendingUp className="size-3.5" />;
			case 'down':
				return <TrendingDown className="size-3.5" />;
			default:
				return <Minus className="size-3.5" />;
		}
	};

	const getTrendColor = () => {
		if (!trend) return 'text-muted-foreground';
		switch (trend.direction) {
			case 'up':
				return 'text-[hsl(var(--forest-green))]';
			case 'down':
				return 'text-[hsl(var(--color-error))]';
			default:
				return 'text-muted-foreground';
		}
	};

	if (variant === 'compact') {
		return (
			<Card
				className={cn(
					'p-4',
					onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
					className
				)}
				onClick={onClick}
			>
				<div className="flex items-center gap-3">
					{icon && (
						<div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
							{icon}
						</div>
					)}
					<div className="min-w-0">
						<p className="text-sm text-muted-foreground truncate">{label}</p>
						<p className="font-display text-xl font-bold text-foreground">
							{prefix}
							{formatValue()}
							{suffix}
						</p>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				'p-6',
				onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
				className
			)}
			onClick={onClick}
		>
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					{trend && (
						<div
							className={cn(
								'inline-flex items-center gap-1 text-xs font-medium',
								getTrendColor()
							)}
						>
							{getTrendIcon()}
							<span>
								{trend.value > 0 ? '+' : ''}
								{trend.value}%
							</span>
							{trend.label && (
								<span className="text-muted-foreground font-normal">
									{trend.label}
								</span>
							)}
						</div>
					)}
					<p className="font-display text-3xl font-bold text-foreground tracking-tight">
						{prefix}
						{formatValue()}
						{suffix}
					</p>
					<p className="text-sm text-muted-foreground">{label}</p>
				</div>
				{icon && (
					<div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
						{icon}
					</div>
				)}
			</div>
		</Card>
	);
}

export { StatCard };
export type { StatCardProps, Trend };
