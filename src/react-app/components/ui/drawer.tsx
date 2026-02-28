import * as React from 'react';
import { X } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '@/react-app/components/ui/dialog';
import { cn } from '@/react-app/lib/utils';

export interface DrawerProps {
	/** Whether the drawer is open */
	open: boolean;
	/** Callback when open state changes */
	onOpenChange: (open: boolean) => void;
	/** Drawer title */
	title?: string;
	/** Drawer description */
	description?: string;
	/** Position of the drawer */
	position?: 'left' | 'right';
	/** Size of the drawer */
	size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
	/** Drawer content */
	children: React.ReactNode;
	/** Show close button */
	showClose?: boolean;
	/** Additional class name */
	className?: string;
}

const sizeClasses = {
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-lg',
	xl: 'sm:max-w-xl',
	full: 'sm:max-w-2xl',
};

/**
 * Drawer is a side panel that slides in from the left or right.
 * It's a thin wrapper around Dialog with position variants.
 */
function Drawer({
	open,
	onOpenChange,
	title,
	description,
	position = 'right',
	size = 'md',
	children,
	showClose = true,
	className,
}: DrawerProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				position={position}
				className={cn('flex flex-col h-full', sizeClasses[size], className)}
				showClose={false}
			>
				{(title || showClose) && (
					<DialogHeader className="space-y-0">
						<div className="flex items-center justify-between">
							{title && <DialogTitle>{title}</DialogTitle>}
							{showClose && (
								<DialogClose asChild>
									<button
										className={cn(
											'rounded-sm opacity-70 ring-offset-background transition-opacity',
											'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
											'disabled:pointer-events-none'
										)}
									>
										<X className="size-5" />
										<span className="sr-only">Close</span>
									</button>
								</DialogClose>
							)}
						</div>
						{description && <DialogDescription>{description}</DialogDescription>}
					</DialogHeader>
				)}
				<div className="flex-1 overflow-y-auto">{children}</div>
			</DialogContent>
		</Dialog>
	);
}

// Additional drawer-specific components for consistency
function DrawerHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('flex flex-col space-y-1.5 border-b pb-4', className)}
			{...props}
		/>
	);
}

function DrawerFooter({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t pt-4 mt-auto',
				className
			)}
			{...props}
		/>
	);
}

function DrawerContent({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('flex-1 py-4', className)} {...props} />;
}

export { Drawer, DrawerHeader, DrawerFooter, DrawerContent };
