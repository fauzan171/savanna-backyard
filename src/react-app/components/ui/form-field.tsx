import * as React from 'react';
import { Label } from '@/react-app/components/ui/label';
import { cn } from '@/react-app/lib/utils';

export interface FormFieldRenderProps {
	id: string;
	error?: string;
}

export interface FormFieldProps {
	/** Field label */
	label?: string;
	/** Field identifier (auto-generated if not provided) */
	id?: string;
	/** Error message to display */
	error?: string;
	/** Hint text to display below input */
	hint?: string;
	/** Mark field as required */
	required?: boolean;
	/** Additional class name for the container */
	className?: string;
	/** The form control element - can be a node or render function */
	children: React.ReactNode | ((props: FormFieldRenderProps) => React.ReactNode);
}

const FormFieldContext = React.createContext<{
	id: string;
	error?: string;
}>({ id: '' });

function FormField({
	label,
	id: propId,
	error,
	hint,
	required,
	className,
	children,
}: FormFieldProps) {
	const autoId = React.useId();
	const id = propId || autoId;

	return (
		<div className={cn('space-y-2', className)}>
			{label && (
				<Label htmlFor={id} required={required}>
					{label}
				</Label>
			)}
			<FormFieldContext.Provider value={{ id, error }}>
				{typeof children === 'function'
					? children({ id, error })
					: React.isValidElement(children)
						? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
								id,
								error,
							})
						: children}
			</FormFieldContext.Provider>
			{hint && !error && (
				<p className="text-xs text-muted-foreground">{hint}</p>
			)}
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}

/**
 * Hook to access form field context
 * Useful for custom form controls that need to integrate with FormField
 */
function useFormField() {
	const context = React.useContext(FormFieldContext);
	if (!context) {
		throw new Error('useFormField must be used within a FormField');
	}
	return context;
}

/**
 * Simple form group for grouping related fields
 */
function FormGroup({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('space-y-4', className)} {...props} />;
}

export { FormField, FormGroup, useFormField };
