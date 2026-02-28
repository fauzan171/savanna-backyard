import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const timelineVariants = cva('flex', {
	variants: {
		orientation: {
			vertical: 'flex-col',
			horizontal: 'flex-row',
		},
	},
	defaultVariants: {
		orientation: 'vertical',
	},
});

const timelineItemVariants = cva('relative', {
	variants: {
		orientation: {
			vertical: 'pb-6 pl-8 last:pb-0',
			horizontal: 'pr-6 last:pr-0',
		},
	},
	defaultVariants: {
		orientation: 'vertical',
	},
});

export interface TimelineItem {
	/** Unique identifier */
	id: string;
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Optional icon */
	icon?: React.ReactNode;
	/** Optional date/timestamp */
	date?: string | Date;
	/** Item status */
	status?: 'completed' | 'current' | 'pending' | 'error';
	/** Additional content */
	content?: React.ReactNode;
}

export interface TimelineProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof timelineVariants> {
	/** Timeline items */
	items: TimelineItem[];
	/** Render custom item content */
	renderItem?: (item: TimelineItem, index: number) => React.ReactNode;
}

const statusStyles = {
	completed: 'bg-[hsl(var(--color-success))] text-[hsl(var(--color-success-foreground))]',
	current: 'bg-primary text-primary-foreground ring-4 ring-primary/20',
	pending: 'bg-muted text-muted-foreground',
	error: 'bg-destructive text-destructive-foreground',
};

const connectorStyles = {
	completed: 'bg-[hsl(var(--color-success))]',
	current: 'bg-primary',
	pending: 'bg-muted',
	error: 'bg-destructive',
};

/**
 * Timeline displays a vertical or horizontal list of events in chronological order.
 */
function Timeline({
	items,
	orientation: orientationProp,
	renderItem,
	className,
	...props
}: TimelineProps) {
	const orientation = orientationProp ?? 'vertical';
	return (
		<div className={cn(timelineVariants({ orientation }), className)} {...props}>
			{items.map((item, index) => (
				<TimelineItemComponent
					key={item.id}
					item={item}
					index={index}
					orientation={orientation}
					isLast={index === items.length - 1}
					renderItem={renderItem}
				/>
			))}
		</div>
	);
}

interface TimelineItemComponentProps {
	item: TimelineItem;
	index: number;
	orientation: 'vertical' | 'horizontal';
	isLast: boolean;
	renderItem?: (item: TimelineItem, index: number) => React.ReactNode;
}

function TimelineItemComponent({
	item,
	index,
	orientation,
	isLast,
	renderItem,
}: TimelineItemComponentProps) {
	const status = item.status || 'pending';
	const dateStr = item.date
		? typeof item.date === 'string'
			? item.date
			: item.date.toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
				})
		: null;

	if (renderItem) {
		return (
			<div className={cn(timelineItemVariants({ orientation }))}>
				{renderItem(item, index)}
			</div>
		);
	}

	return (
		<div className={cn(timelineItemVariants({ orientation }))}>
			{/* Connector line */}
			{orientation === 'vertical' && !isLast && (
				<div
					className={cn(
						'absolute left-[0.6rem] top-4 w-0.5 h-full -translate-x-1/2',
						connectorStyles[status]
					)}
				/>
			)}

			{/* Status dot/icon */}
			<div
				className={cn(
					'absolute left-0 top-1 flex size-5 items-center justify-center rounded-full',
					statusStyles[status]
				)}
			>
				{item.icon || (
					<span className="size-2 rounded-full bg-current" />
				)}
			</div>

			{/* Content */}
			<div className="flex-1">
				<div className="flex items-start justify-between gap-2">
					<h4 className="text-sm font-semibold text-foreground">
						{item.title}
					</h4>
					{dateStr && (
						<span className="text-xs text-muted-foreground whitespace-nowrap">
							{dateStr}
						</span>
					)}
				</div>
				{item.description && (
					<p className="mt-1 text-sm text-muted-foreground">
						{item.description}
					</p>
				)}
				{item.content && (
					<div className="mt-2">{item.content}</div>
				)}
			</div>
		</div>
	);
}

// ============================================
// DOMAIN-SPECIFIC TIMELINE VARIANTS
// ============================================

/** Booking activity timeline */
function BookingTimeline({ items, className, ...props }: Omit<TimelineProps, 'items'> & { items: TimelineItem[] }) {
	return (
		<Timeline
			items={items}
			className={cn('bg-card rounded-lg border p-4', className)}
			{...props}
		/>
	);
}

/** Lead activity timeline */
function LeadTimeline({ items, className, ...props }: Omit<TimelineProps, 'items'> & { items: TimelineItem[] }) {
	return (
		<Timeline
			items={items}
			className={cn('bg-card rounded-lg border p-4', className)}
			{...props}
		/>
	);
}

/** Generic activity timeline */
function ActivityTimeline({ items, className, ...props }: Omit<TimelineProps, 'items'> & { items: TimelineItem[] }) {
	return (
		<Timeline
			items={items}
			className={className}
			{...props}
		/>
	);
}

// Composed export following StatusBadge pattern
const TimelineNamespace = {
	Root: Timeline,
	Booking: BookingTimeline,
	Lead: LeadTimeline,
	Activity: ActivityTimeline,
};

export {
	Timeline,
	TimelineNamespace,
	BookingTimeline,
	LeadTimeline,
	ActivityTimeline,
	timelineVariants,
	timelineItemVariants,
};
