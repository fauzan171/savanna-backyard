import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/react-app/lib/utils';

export interface BreadcrumbItem {
	/** Display label */
	label: string;
	/** Link href (optional - if missing, item is not clickable) */
	href?: string;
}

export interface PageHeaderProps {
	/** Page title (h1) */
	title: string;
	/** Page description/subtitle */
	description?: string;
	/** Breadcrumb items */
	breadcrumb?: BreadcrumbItem[];
	/** Action buttons slot */
	actions?: React.ReactNode;
	/** Additional class name */
	className?: string;
	/** Make header sticky */
	sticky?: boolean;
	/** Show border below header */
	bordered?: boolean;
}

function PageHeader({
	title,
	description,
	breadcrumb,
	actions,
	className,
	sticky = false,
	bordered = true,
}: PageHeaderProps) {
	return (
		<div
			className={cn(
				'bg-background pb-4 pt-2',
				sticky && 'sticky top-0 z-10',
				bordered && 'border-b border-border mb-6',
				className
			)}
		>
			{/* Breadcrumb */}
			{breadcrumb && breadcrumb.length > 0 && (
				<nav className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
					{breadcrumb.map((item, index) => (
						<React.Fragment key={item.href || item.label}>
							{index > 0 && <ChevronRight className="size-4" />}
							{item.href ? (
								<Link
									to={item.href}
									className="hover:text-foreground transition-colors"
								>
									{item.label}
								</Link>
							) : (
								<span className="text-foreground font-medium">{item.label}</span>
							)}
						</React.Fragment>
					))}
				</nav>
			)}

			{/* Title row */}
			<div className="flex items-center justify-between gap-4">
				<div className="min-w-0 flex-1">
					<h1 className="font-display text-2xl font-bold tracking-tight text-foreground truncate">
						{title}
					</h1>
					{description && (
						<p className="mt-1 text-sm text-muted-foreground">{description}</p>
					)}
				</div>

				{/* Actions */}
				{actions && (
					<div className="flex items-center gap-2 shrink-0">{actions}</div>
				)}
			</div>
		</div>
	);
}

/**
 * Compact page header for simpler pages
 */
function PageHeaderCompact({
	title,
	actions,
	className,
}: Pick<PageHeaderProps, 'title' | 'actions' | 'className'>) {
	return (
		<div className={cn('flex items-center justify-between gap-4 mb-4', className)}>
			<h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
				{title}
			</h1>
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</div>
	);
}

export { PageHeader, PageHeaderCompact };
