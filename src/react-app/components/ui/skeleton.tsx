import * as React from 'react';
import { cn } from '@/react-app/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'table-row';
	width?: string | number;
	height?: string | number;
}

function Skeleton({
	variant = 'rectangular',
	width,
	height,
	className,
	...props
}: SkeletonProps) {
	const variantClasses = {
		text: 'rounded h-4',
		circular: 'rounded-full',
		rectangular: 'rounded-md',
		card: 'rounded-lg',
		avatar: 'rounded-full size-10',
		'table-row': 'rounded-md h-12',
	};

	const style: React.CSSProperties = {
		width: width ?? (variant === 'text' ? '100%' : undefined),
		height: height ?? (variant === 'circular' ? width : undefined),
	};

	return (
		<div
			className={cn(
				'animate-pulse-subtle bg-muted',
				variantClasses[variant],
				className
			)}
			style={style}
			{...props}
		/>
	);
}

// Pre-built skeleton patterns
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
	return (
		<div className={cn('space-y-2', className)}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					variant="text"
					className={cn(i === lines - 1 && 'w-4/5')}
				/>
			))}
		</div>
	);
}

function SkeletonCard({ className }: { className?: string }) {
	return (
		<div className={cn('p-6 border border-border rounded-lg', className)}>
			<div className="space-y-4">
				<div className="flex items-center gap-4">
					<Skeleton variant="avatar" />
					<div className="flex-1 space-y-2">
						<Skeleton variant="text" className="w-1/3" />
						<Skeleton variant="text" className="w-1/2" />
					</div>
				</div>
				<SkeletonText lines={2} />
			</div>
		</div>
	);
}

function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
	return (
		<div className="w-full">
			{/* Header */}
			<div className="flex gap-4 p-4 border-b border-border">
				{Array.from({ length: columns }).map((_, i) => (
					<Skeleton key={i} variant="text" className="flex-1 h-4" />
				))}
			</div>
			{/* Rows */}
			{Array.from({ length: rows }).map((_, rowIndex) => (
				<div key={rowIndex} className="flex gap-4 p-4 border-b border-border">
					{Array.from({ length: columns }).map((_, colIndex) => (
						<Skeleton
							key={colIndex}
							variant="text"
							className={cn('flex-1 h-4', colIndex === 0 && 'font-medium')}
						/>
					))}
				</div>
			))}
		</div>
	);
}

function SkeletonStatCards({ count = 4 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{Array.from({ length: count }).map((_, i) => (
				<div key={i} className="p-6 border border-border rounded-lg">
					<div className="flex justify-between items-start mb-4">
						<Skeleton variant="text" className="w-20 h-3" />
						<Skeleton variant="circular" width={40} height={40} />
					</div>
					<Skeleton variant="text" className="w-24 h-8 mb-2" />
					<Skeleton variant="text" className="w-16 h-3" />
				</div>
			))}
		</div>
	);
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonStatCards };
export type { SkeletonProps };
