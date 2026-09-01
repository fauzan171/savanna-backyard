import * as React from 'react';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
	type ColumnFiltersState,
	type RowSelectionState,
	type VisibilityState,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Checkbox } from '@/react-app/components/ui/checkbox';
import { EmptyState } from '@/react-app/components/ui/empty-state';
import { Spinner } from '@/react-app/components/ui/spinner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/react-app/components/ui/select';

// ============================================
// TABLE COMPONENTS
// ============================================

const Table = React.forwardRef<
	HTMLTableElement,
	React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
	<div className="relative w-full overflow-auto">
		<table
			ref={ref}
			className={cn('w-full caption-bottom text-sm', className)}
			{...props}
		/>
	</div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tbody
		ref={ref}
		className={cn('[&_tr:last-child]:border-0', className)}
		{...props}
	/>
));
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
	HTMLTableSectionElement,
	React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
	<tfoot
		ref={ref}
		className={cn(
			'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
			className
		)}
		{...props}
	/>
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
	HTMLTableRowElement,
	React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
	<tr
		ref={ref}
		className={cn(
			'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
			className
		)}
		{...props}
	/>
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
	HTMLTableCellElement,
	React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
	<th
		ref={ref}
		className={cn(
			'h-12 px-5 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
			className
		)}
		{...props}
	/>
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
	HTMLTableCellElement,
	React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
	<td
		ref={ref}
		className={cn(
			'p-5 align-middle [&:has([role=checkbox])]:pr-0',
			className
		)}
		{...props}
	/>
));
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
	HTMLTableCaptionElement,
	React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
	<caption
		ref={ref}
		className={cn('mt-4 text-sm text-muted-foreground', className)}
		{...props}
	/>
));
TableCaption.displayName = 'TableCaption';

// ============================================
// DATA TABLE (TanStack)
// ============================================

export interface DataTableProps<TData, TValue> {
	/** Column definitions */
	columns: ColumnDef<TData, TValue>[];
	/** Data to display */
	data: TData[];
	/** Enable sorting */
	enableSorting?: boolean;
	/** Enable filtering (global search) */
	enableFiltering?: boolean;
	/** Enable row selection */
	enableRowSelection?: boolean;
	/** Enable pagination */
	enablePagination?: boolean;
	/** Initial page size */
	pageSize?: number;
	/** Page size options */
	pageSizeOptions?: number[];
	/** Loading state */
	isLoading?: boolean;
	/** Custom empty state */
	emptyState?: React.ReactNode;
	/** Search placeholder */
	searchPlaceholder?: string;
	/** No data message */
	noDataMessage?: string;
	/** No data description */
	noDataDescription?: string;
	/** Row click handler */
	onRowClick?: (row: TData) => void;
	/** Selection change handler */
	onSelectionChange?: (selection: TData[]) => void;
	/** Additional class name */
	className?: string;
	/** Render mobile card view */
	renderCard?: (item: TData) => React.ReactNode;
}

function DataTable<TData, TValue>({
	columns,
	data,
	enableSorting = true,
	enableFiltering = true,
	enableRowSelection = false,
	enablePagination = true,
	pageSize = 10,
	pageSizeOptions = [10, 20, 30, 50],
	isLoading = false,
	emptyState,
	searchPlaceholder = 'Cari data...',
	noDataMessage = 'Data tidak ditemukan',
	noDataDescription = 'Ubah kata kunci atau filter, lalu coba lagi',
	onRowClick,
	onSelectionChange,
	className,
	renderCard,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [globalFilter, setGlobalFilter] = React.useState('');

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
		getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onRowSelectionChange: setRowSelection,
		onColumnVisibilityChange: setColumnVisibility,
		onGlobalFilterChange: setGlobalFilter,
		// BUG#10: reset to page 0 when data/filters shrink so users don't stare
		// at an empty page beyond the new last page.
		autoResetPageIndex: true,
		state: {
			sorting,
			columnFilters,
			rowSelection,
			columnVisibility,
			globalFilter,
		},
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize,
			},
		},
	});

	// Notify parent of selection changes
	React.useEffect(() => {
		if (onSelectionChange) {
			const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
			onSelectionChange(selectedRows);
		}
	}, [rowSelection, onSelectionChange, table]);

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className={cn('space-y-4', className)}>
			{/* Toolbar */}
			{enableFiltering && (
				<div className="flex items-center justify-between gap-4">
					<Input
						placeholder={searchPlaceholder}
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="max-w-sm"
					/>
					{enableRowSelection && Object.keys(rowSelection).length > 0 && (
						<span className="text-sm text-muted-foreground">
							{Object.keys(rowSelection).length} selected
						</span>
					)}
				</div>
			)}

			{/* Desktop Table View */}
			<div className="hidden md:block rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder ? null : (
											<div
												className={cn(
													'flex items-center gap-2',
													header.column.getCanSort() && 'cursor-pointer select-none'
												)}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{header.column.getCanSort() && (
													<span className="text-muted-foreground">
														{header.column.getIsSorted() === 'asc' ? (
															<ArrowUp className="size-4" />
														) : header.column.getIsSorted() === 'desc' ? (
															<ArrowDown className="size-4" />
														) : (
															<ArrowUpDown className="size-4" />
														)}
													</span>
												)}
											</div>
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{(() => {
							const rows = table.getRowModel().rows;
							return rows?.length ? (
								rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									onClick={() => onRowClick?.(row.original)}
									className={onRowClick && 'cursor-pointer'}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
								))
							) : (
								<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									{emptyState || (
										<EmptyState
											title={noDataMessage}
											description={noDataDescription}
											type="no-results"
											size="sm"
										/>
									)}
								</TableCell>
								</TableRow>
							);
						})()}
					</TableBody>
				</Table>
			</div>

			{/* Mobile Card View */}
			<div className="md:hidden space-y-3">
				{table.getRowModel().rows?.length ? (
					table.getRowModel().rows.map((row) => (
						<div
							key={row.id}
							onClick={() => onRowClick?.(row.original)}
							className={cn(
								'rounded-lg border bg-card p-4 space-y-2',
								onRowClick && 'cursor-pointer hover:bg-muted/50'
							)}
						>
							{renderCard ? (
								renderCard(row.original)
							) : (
								// Default card rendering - show all cells
								row.getVisibleCells().map((cell) => (
									<div key={cell.id} className="flex justify-between items-start">
										<span className="text-sm text-muted-foreground">
											{cell.column.columnDef.header as string}
										</span>
										<span className="text-sm font-medium">
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</span>
									</div>
								))
							)}
						</div>
					))
				) : (
					emptyState || (
						<EmptyState
							title={noDataMessage}
							description={noDataDescription}
							type="no-results"
						/>
					)
				)}
			</div>

			{/* Pagination */}
			{enablePagination && (
				<div className="flex items-center justify-between px-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>
							Page {table.getState().pagination.pageIndex + 1} of{' '}
							{table.getPageCount()}
						</span>
						<span>|</span>
						<span>{table.getFilteredRowModel().rows.length} total</span>
					</div>
					<div className="flex items-center gap-2">
						<Select
							value={`${table.getState().pagination.pageSize}`}
							onValueChange={(value) => table.setPageSize(Number(value))}
						>
							<SelectTrigger className="h-8 w-[70px]">
								<SelectValue placeholder={table.getState().pagination.pageSize} />
							</SelectTrigger>
							<SelectContent side="top">
								{pageSizeOptions.map((size) => (
									<SelectItem key={size} value={`${size}`}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="flex items-center gap-1">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.setPageIndex(0)}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronsLeft className="size-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								<ChevronLeft className="size-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								<ChevronRight className="size-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.setPageIndex(table.getPageCount() - 1)}
								disabled={!table.getCanNextPage()}
							>
								<ChevronsRight className="size-4" />
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================
// TABLE COLUMN HELPERS
// ============================================

/** Creates a selection column for row selection */
function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
	return {
		id: '__select__',
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && 'indeterminate')
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
				onClick={(e) => e.stopPropagation()}
			/>
		),
		enableSorting: false,
		enableHiding: false,
	};
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableRow,
	TableHead,
	TableCell,
	TableCaption,
	DataTable,
	createSelectColumn,
};
