import * as React from 'react';
import { cn } from '@/react-app/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: 'sm' | 'md' | 'lg';
}

function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
	const sizeClasses = {
		sm: 'size-4',
		md: 'size-6',
		lg: 'size-8',
	};

	return (
		<div
			role="status"
			className={cn('animate-spin-smooth', sizeClasses[size], className)}
			{...props}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				className="w-full h-full"
			>
				<circle
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					strokeOpacity="0.2"
					strokeWidth="3"
				/>
				<path
					d="M12 2a10 10 0 0 1 10 10"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
					className="text-primary"
				/>
			</svg>
			<span className="sr-only">Loading...</span>
		</div>
	);
}

// Full-page loading overlay
interface LoadingOverlayProps {
	visible: boolean;
	label?: string;
}

function LoadingOverlay({ visible, label = 'Loading...' }: LoadingOverlayProps) {
	if (!visible) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-4">
				<Spinner size="lg" />
				<p className="text-sm text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

export { Spinner, LoadingOverlay };
export type { SpinnerProps };
