import * as React from 'react';
import { Search, Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/react-app/components/ui/popover';
import { Spinner } from '@/react-app/components/ui/spinner';
import { Badge } from '@/react-app/components/ui/badge';

export interface ComboboxOption<T = string> {
	value: T;
	label: string;
	sublabel?: string;
	badge?: string;
	disabled?: boolean;
}

export interface ComboboxProps<T = string> {
	/** Available options */
	options: ComboboxOption<T>[];
	/** Currently selected value */
	value?: T | null;
	/** Selection change handler */
	onChange?: (value: T | null) => void;
	/** Async search handler */
	onSearch?: (query: string) => void | Promise<void>;
	/** Placeholder text */
	placeholder?: string;
	/** Search input placeholder */
	searchPlaceholder?: string;
	/** No results message */
	noResultsMessage?: string;
	/** Loading state */
	isLoading?: boolean;
	/** Disabled state */
	disabled?: boolean;
	/** Error state */
	error?: boolean;
	/** Custom display value renderer */
	displayValue?: (value: T) => string;
	/** Custom option renderer */
	renderOption?: (option: ComboboxOption<T>) => React.ReactNode;
	/** Size variant */
	size?: 'sm' | 'md' | 'lg';
	/** Additional class name */
	className?: string;
	/** ID for form field */
	id?: string;
}

export function Combobox<T extends string = string>({
	options,
	value,
	onChange,
	onSearch,
	placeholder = 'Select option...',
	searchPlaceholder = 'Search...',
	noResultsMessage = 'No results found.',
	isLoading = false,
	disabled = false,
	error = false,
	displayValue,
	renderOption,
	size = 'md',
	className,
	id,
}: ComboboxProps<T>) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState('');
	const searchRef = React.useRef<HTMLInputElement>(null);

	// Focus search input when popover opens
	React.useEffect(() => {
		if (open && searchRef.current) {
			setTimeout(() => searchRef.current?.focus(), 100);
		}
	}, [open]);

	// Debounced search
	React.useEffect(() => {
		if (!onSearch) return;

		const timeout = setTimeout(() => {
			onSearch(searchQuery);
		}, 300);

		return () => clearTimeout(timeout);
	}, [searchQuery, onSearch]);

	const selectedOption = options.find((opt) => opt.value === value);
	const displayLabel = value
		? displayValue
			? displayValue(value)
			: selectedOption?.label || value
		: placeholder;

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange?.(null);
	};

	const handleSelect = (option: ComboboxOption<T>) => {
		if (option.disabled) return;
		onChange?.(option.value);
		setOpen(false);
		setSearchQuery('');
	};

	const filteredOptions = onSearch
		? options // If async search, don't filter locally
		: searchQuery
			? options.filter((opt) =>
					opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
					opt.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
			  )
			: options;

	const sizeClasses = {
		sm: 'h-8 text-xs',
		md: 'h-10 text-sm',
		lg: 'h-12 text-base',
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						'w-full justify-between font-normal',
						sizeClasses[size],
						!value && 'text-muted-foreground',
						error && 'border-destructive focus-visible:ring-destructive',
						className
					)}
				>
					<span className="truncate flex-1 text-left">{displayLabel}</span>
					{value && !disabled ? (
						<X
							className="size-4 opacity-50 hover:opacity-100 ml-2 shrink-0"
							onClick={handleClear}
						/>
					) : (
						<ChevronDown className="size-4 opacity-50 ml-2 shrink-0" />
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
				sideOffset={4}
			>
				{/* Search Input */}
				<div className="p-3 border-b">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
						<Input
							ref={searchRef}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={searchPlaceholder}
							className="pl-9 pr-9"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery('')}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							>
								<X className="size-4" />
							</button>
						)}
					</div>
				</div>

				{/* Options List */}
				<div className="max-h-60 overflow-auto p-1">
					{isLoading ? (
						<div className="flex items-center justify-center py-6">
							<Spinner size="sm" />
						</div>
					) : filteredOptions.length === 0 ? (
						<div className="text-center py-6 text-sm text-muted-foreground">
							{noResultsMessage}
						</div>
					) : (
						<div className="space-y-1">
							{filteredOptions.map((option) => {
								const isSelected = option.value === value;
								const isDisabled = option.disabled;

								return (
									<button
										key={String(option.value)}
										type="button"
										disabled={isDisabled}
										className={cn(
											'w-full flex items-start gap-2 px-3 py-2 rounded-md text-sm',
											'transition-colors text-left',
											'focus:outline-none focus:ring-2 focus:ring-ring',
											isDisabled && 'opacity-50 cursor-not-allowed',
											!isDisabled && 'hover:bg-accent',
											isSelected && 'bg-accent'
										)}
										onClick={() => handleSelect(option)}
									>
										<span className="flex-1 min-w-0">
											{renderOption ? (
												renderOption(option)
											) : (
												<>
													<span className="block truncate font-medium">
														{option.label}
													</span>
													{option.sublabel && (
														<span className="block truncate text-xs text-muted-foreground">
															{option.sublabel}
														</span>
													)}
												</>
											)}
										</span>
										{option.badge && (
											<Badge variant="outline" size="sm" className="shrink-0">
												{option.badge}
											</Badge>
										)}
										{isSelected && (
											<Check className="size-4 text-primary shrink-0 mt-0.5" />
										)}
									</button>
								);
							})}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
