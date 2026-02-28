import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';
import { User } from 'lucide-react';

const avatarVariants = cva(
	'relative flex items-center justify-center overflow-hidden bg-muted font-medium text-muted-foreground',
	{
		variants: {
			size: {
				xs: 'size-6 text-[10px]',
				sm: 'size-8 text-xs',
				md: 'size-10 text-sm',
				lg: 'size-12 text-base',
				xl: 'size-16 text-lg',
			},
			shape: {
				circle: 'rounded-full',
				square: 'rounded-lg',
			},
		},
		defaultVariants: {
			size: 'md',
			shape: 'circle',
		},
	}
);

export interface AvatarProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof avatarVariants> {
	src?: string;
	name: string;
	showFallbackIcon?: boolean;
}

function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length === 1) {
		return words[0].charAt(0).toUpperCase();
	}
	return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function Avatar({
	src,
	name,
	size = 'md',
	shape = 'circle',
	showFallbackIcon = false,
	className,
	...props
}: AvatarProps) {
	const [imageError, setImageError] = React.useState(false);

	const showImage = src && !imageError;
	const showInitials = !showImage && !showFallbackIcon;
	const showIcon = !showImage && showFallbackIcon;

	return (
		<div
			role="img"
			aria-label={name}
			className={cn(avatarVariants({ size, shape }), className)}
			{...props}
		>
			{showImage && (
				<img
					src={src}
					alt={name}
					className="size-full object-cover"
					onError={() => setImageError(true)}
				/>
			)}
			{showInitials && <span>{getInitials(name)}</span>}
			{showIcon && <User className="size-[60%]" />}
		</div>
	);
}

// Avatar Group for stacked avatars
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	max?: number;
	children: React.ReactNode;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

function AvatarGroup({
	max = 4,
	children,
	size = 'md',
	className,
	...props
}: AvatarGroupProps) {
	const childArray = React.Children.toArray(children);
	const visibleChildren = childArray.slice(0, max);
	const remainingCount = childArray.length - max;

	return (
		<div className={cn('flex -space-x-2', className)} {...props}>
			{visibleChildren.map((child, index) => (
				<div
					key={index}
					className="ring-2 ring-background rounded-full"
				>
					{child}
				</div>
			))}
			{remainingCount > 0 && (
				<div
					className={cn(
						'ring-2 ring-background rounded-full flex items-center justify-center bg-muted font-medium',
						avatarVariants({ size, shape: 'circle' })
					)}
				>
					+{remainingCount}
				</div>
			)}
		</div>
	);
}

export { Avatar, AvatarGroup, avatarVariants };
