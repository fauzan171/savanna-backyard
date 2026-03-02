import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Card, CardContent, CardHeader } from '@/react-app/components/ui/card';
import { Badge } from '@/react-app/components/ui/badge';

export interface PriceItem {
	id: string;
	label: string;
	amount: number;
	currency?: 'IDR' | 'USD';
	type?: 'base' | 'addon' | 'discount' | 'tax' | 'fee';
	quantity?: number;
	unitPrice?: number;
	description?: string;
}

export interface PriceBreakdownProps {
	/** Price line items */
	items: PriceItem[];
	/** Currency for display */
	currency?: 'IDR' | 'USD';
	/** Show detailed breakdown */
	showDetails?: boolean;
	/** Initially expanded */
	defaultExpanded?: boolean;
	/** Size variant */
	variant?: 'compact' | 'default' | 'detailed';
	/** Show itemized list */
	showItemList?: boolean;
	/** Optional header */
	header?: React.ReactNode;
	/** Optional footer */
	footer?: React.ReactNode;
	/** Additional class name */
	className?: string;
}

export interface PriceSummaryProps {
	/** Total amount */
	total: number;
	/** Currency */
	currency?: 'IDR' | 'USD';
	/** Label */
	label?: string;
	/** Subtotal (for showing before discount/tax) */
	subtotal?: number;
	/** Show subtotal */
	showSubtotal?: boolean;
	/** Size variant */
	size?: 'sm' | 'md' | 'lg';
	/** Highlight color */
	highlight?: boolean;
	/** Additional class name */
	className?: string;
}

// Currency formatter
const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export function PriceBreakdown({
	items,
	currency = 'IDR',
	showDetails = true,
	defaultExpanded = true,
	variant = 'default',
	showItemList = true,
	header,
	footer,
	className,
}: PriceBreakdownProps) {
	const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

	// Calculate totals
	const totals = React.useMemo(() => {
		const baseItems = items.filter((item) => item.type === 'base' || !item.type);
		const addonItems = items.filter((item) => item.type === 'addon');
		const discountItems = items.filter((item) => item.type === 'discount');
		const taxItems = items.filter((item) => item.type === 'tax');
		const feeItems = items.filter((item) => item.type === 'fee');

		const baseTotal = baseItems.reduce((sum, item) => sum + item.amount, 0);
		const addonTotal = addonItems.reduce((sum, item) => sum + item.amount, 0);
		const discountTotal = discountItems.reduce((sum, item) => sum + item.amount, 0);
		const taxTotal = taxItems.reduce((sum, item) => sum + item.amount, 0);
		const feeTotal = feeItems.reduce((sum, item) => sum + item.amount, 0);

		const subtotal = baseTotal + addonTotal;
		const total = subtotal - discountTotal + taxTotal + feeTotal;

		return {
			baseTotal,
			addonTotal,
			discountTotal,
			taxTotal,
			feeTotal,
			subtotal,
			total,
		};
	}, [items]);

	const isCompact = variant === 'compact';
	const isDetailed = variant === 'detailed';

	return (
		<Card className={cn('overflow-hidden', className)}>
			{header && <CardHeader className="pb-3">{header}</CardHeader>}

			<CardContent className="space-y-4">
				{/* Itemized List (collapsible) */}
				{showItemList && items.length > 0 && (
					<div>
						{!isCompact && showDetails && (
							<button
								type="button"
								onClick={() => setIsExpanded(!isExpanded)}
								className="flex items-center justify-between w-full text-sm font-medium mb-3 hover:text-foreground/80"
							>
								<span>Price Details</span>
								{isExpanded ? (
									<ChevronUp className="size-4" />
								) : (
									<ChevronDown className="size-4" />
								)}
							</button>
						)}

						{(isExpanded || isCompact || !showDetails) && (
							<div className="space-y-2">
								{items.map((item) => (
									<div
										key={item.id}
										className={cn(
											'flex justify-between items-start gap-4 text-sm',
											item.type === 'discount' && 'text-success'
										)}
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="truncate">{item.label}</span>
												{item.quantity && item.quantity > 1 && (
													<Badge variant="outline" size="sm">
														{item.quantity}x
													</Badge>
												)}
											</div>
											{isDetailed && item.description && (
												<p className="text-xs text-muted-foreground mt-0.5">
													{item.description}
												</p>
											)}
											{isDetailed && item.unitPrice && (
												<p className="text-xs text-muted-foreground">
													{formatCurrency(item.unitPrice, item.currency || currency)} each
												</p>
											)}
										</div>
										<span
											className={cn(
												'font-medium shrink-0',
												item.type === 'discount' && 'text-success'
											)}
										>
											{item.type === 'discount' ? '-' : ''}
											{formatCurrency(item.amount, item.currency || currency)}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{/* Summary Section */}
				<div className="pt-3 border-t space-y-2">
					{isDetailed && (
						<>
							{totals.addonTotal > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Add-ons</span>
									<span>{formatCurrency(totals.addonTotal, currency)}</span>
								</div>
							)}
							{totals.discountTotal > 0 && (
								<div className="flex justify-between text-sm text-success">
									<span>Discount</span>
									<span>-{formatCurrency(totals.discountTotal, currency)}</span>
								</div>
							)}
							{totals.taxTotal > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Tax</span>
									<span>{formatCurrency(totals.taxTotal, currency)}</span>
								</div>
							)}
							{totals.feeTotal > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Fees</span>
									<span>{formatCurrency(totals.feeTotal, currency)}</span>
								</div>
							)}
						</>
					)}

					{/* Total */}
					<div className="flex justify-between items-baseline gap-4 pt-2">
						<span className="text-base font-semibold">Total</span>
						<span className="text-xl font-bold text-primary">
							{formatCurrency(totals.total, currency)}
						</span>
					</div>
				</div>

				{footer && <div className="pt-2">{footer}</div>}
			</CardContent>
		</Card>
	);
}

export function PriceSummary({
	total,
	currency = 'IDR',
	label = 'Total',
	subtotal,
	showSubtotal = false,
	size = 'md',
	highlight = false,
	className,
}: PriceSummaryProps) {
	const sizeClasses = {
		sm: 'text-lg',
		md: 'text-2xl',
		lg: 'text-3xl',
	};

	return (
		<div className={cn('space-y-1', className)}>
			{showSubtotal && subtotal !== undefined && subtotal !== total && (
				<div className="flex justify-between items-baseline gap-4 text-sm">
					<span className="text-muted-foreground">Subtotal</span>
					<span className="font-medium line-through text-muted-foreground">
						{formatCurrency(subtotal, currency)}
					</span>
				</div>
			)}
			<div className="flex justify-between items-baseline gap-4">
				<span className="text-sm font-medium text-muted-foreground">{label}</span>
				<span
					className={cn(
						'font-bold',
						sizeClasses[size],
						highlight && 'text-primary'
					)}
				>
					{formatCurrency(total, currency)}
				</span>
			</div>
		</div>
	);
}
