import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/react-app/lib/utils';

const cardVariants = cva(
	'rounded-lg text-card-foreground transition-all duration-200',
	{
		variants: {
			variant: {
				default: 'bg-card border border-border shadow-sm',
				outlined: 'bg-card border-2 border-border',
				elevated: 'bg-card border border-border shadow-md hover:shadow-lg',
				ghost: 'bg-transparent',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

export interface CardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
	return (
		<div className={cn(cardVariants({ variant }), className)} {...props} />
	);
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn(
				'font-display text-lg font-semibold leading-none tracking-tight text-card-foreground',
				className
			)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('flex items-center p-6 pt-0 border-t border-border mt-4', className)}
			{...props}
		/>
	);
}

function CardActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('flex items-center gap-2', className)}
			{...props}
		/>
	);
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardActions, cardVariants };
