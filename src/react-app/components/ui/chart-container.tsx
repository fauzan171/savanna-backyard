import * as React from 'react';
import { cn } from '@/react-app/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardActions } from './card';
import { Skeleton } from './skeleton';

export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	loading?: boolean;
	empty?: boolean;
	emptyMessage?: string;
	children: React.ReactNode;
}

function ChartContainer({
	title,
	description,
	actions,
	loading,
	empty,
	emptyMessage = 'No data available',
	children,
	className,
	...props
}: ChartContainerProps) {
	return (
		<Card className={cn('', className)} {...props}>
			<CardHeader className="flex flex-row items-start justify-between space-y-0">
				<div className="space-y-1">
					<CardTitle className="text-base font-semibold">{title}</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</div>
				{actions && <CardActions>{actions}</CardActions>}
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex h-[300px] items-center justify-center">
						<Skeleton className="h-full w-full" />
					</div>
				) : empty ? (
					<div className="flex h-[300px] items-center justify-center">
						<p className="text-sm text-muted-foreground">{emptyMessage}</p>
					</div>
				) : (
					children
				)}
			</CardContent>
		</Card>
	);
}

export { ChartContainer };
