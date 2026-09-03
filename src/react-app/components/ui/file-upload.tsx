import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/react-app/lib/utils';
import { Button } from '@/react-app/components/ui/button';

const dropzoneVariants = cva(
	'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200',
	{
		variants: {
			variant: {
				default: 'border-border bg-background hover:border-primary/50 hover:bg-muted/50',
				active: 'border-primary bg-primary/5',
				error: 'border-destructive bg-destructive/5',
				success: 'border-[hsl(var(--color-success))] bg-[hsl(var(--color-success-bg))]',
				disabled: 'border-muted bg-muted/50 opacity-50 cursor-not-allowed',
			},
			size: {
				sm: 'p-4 min-h-[80px]',
				md: 'p-8 min-h-[150px]',
				lg: 'p-12 min-h-[200px]',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'md',
		},
	}
);

export interface FileUploadProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
	/** Accepted file types (MIME types or extensions) */
	accept?: string;
	/** Maximum file size in bytes */
	maxSize?: number;
	/** Maximum number of files */
	maxFiles?: number;
	/** Allow multiple file selection */
	multiple?: boolean;
	/** Selected files */
	value?: File[];
	/** Callback when files change */
	onChange?: (files: File[]) => void;
	/** Validation error */
	error?: string;
	/** Disabled state */
	disabled?: boolean;
	/** Show preview for images */
	showPreview?: boolean;
	/** Custom dropzone content */
	children?: React.ReactNode;
	/** Size variant */
	size?: VariantProps<typeof dropzoneVariants>['size'];
}

interface FilePreviewProps {
	file: File;
	onRemove: () => void;
	showPreview?: boolean;
}

function FilePreview({ file, onRemove, showPreview = true }: FilePreviewProps) {
	const [preview, setPreview] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (showPreview && file.type.startsWith('image/')) {
			const url = URL.createObjectURL(file);
			setPreview(url);
			return () => URL.revokeObjectURL(url);
		}
	}, [file, showPreview]);

	const getFileIcon = () => {
		if (file.type.startsWith('image/')) return <Image className="size-5" />;
		if (file.type.includes('pdf')) return <FileText className="size-5" />;
		return <File className="size-5" />;
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<div className="flex items-center gap-3 p-3 rounded-md border bg-card">
			{preview ? (
				<img src={preview} alt={file.name} className="size-10 rounded object-cover" />
			) : (
				<div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
					{getFileIcon()}
				</div>
			)}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{file.name}</p>
				<p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={onRemove}
				className="size-8 p-0 text-muted-foreground hover:text-destructive"
			>
				<X className="size-4" />
			</Button>
		</div>
	);
}

/**
 * FileUpload provides a drag-and-drop zone for file uploads.
 */
const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
	(
		{
			accept,
			maxSize = 5 * 1024 * 1024, // 5MB default
			maxFiles = 1,
			multiple = false,
			value = [],
			onChange,
			error,
			disabled = false,
			showPreview = true,
			children,
			size = 'md',
			className,
			...props
		},
		ref
	) => {
		const [isDragging, setIsDragging] = React.useState(false);
		// TC-VEH-003: when selected files are rejected by accept/maxSize,
		// surface WHY to the user instead of silently dropping them.
		const [rejectError, setRejectError] = React.useState('');
		const inputRef = React.useRef<HTMLInputElement>(null);

		const displayError = error || rejectError;

		const variant = disabled
			? 'disabled'
			: displayError
				? 'error'
				: isDragging
					? 'active'
					: 'default';

		const handleDragOver = (e: React.DragEvent) => {
			e.preventDefault();
			if (!disabled) setIsDragging(true);
		};

		const handleDragLeave = (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
		};

		const validateFiles = (files: File[]): { valid: File[]; rejected: string } => {
			let validFiles = [...files];
			let rejected = '';

			// Filter by accepted types
			if (accept) {
				const acceptTypes = accept.split(',').map(t => t.trim());
				// TC-BK-006: some valid PNGs arrive with file.type = '' (OS/browser
				// cannot map the MIME) — infer a candidate MIME from the extension
				// so the accept check does not reject them.
				const EXT_MIME: Record<string, string> = {
					'.png': 'image/png',
					'.jpg': 'image/jpeg',
					'.jpeg': 'image/jpeg',
					'.webp': 'image/webp',
					'.gif': 'image/gif',
				};
				const before = validFiles.length;
				validFiles = validFiles.filter(file => {
					const fileExtension = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
					const candidates = [file.type, EXT_MIME[fileExtension]].filter(Boolean) as string[];
					return acceptTypes.some(type =>
						candidates.some(c =>
							type === c || type === fileExtension || c.startsWith(type.replace('/*', '/'))
						)
					);
				});
				if (validFiles.length < before) {
					rejected = `Format file tidak didukung. Hanya menerima: ${accept}`;
				}
			}

			// Filter by max size
			const beforeSize = validFiles.length;
			validFiles = validFiles.filter(file => file.size <= maxSize);
			if (validFiles.length < beforeSize) {
				rejected = rejected || `Ukuran file melebihi batas ${formatMaxSize(maxSize)}`;
			}

			// Limit to maxFiles
			if (!multiple) {
				validFiles = validFiles.slice(0, 1);
			} else {
				validFiles = validFiles.slice(0, maxFiles - value.length);
			}

			return { valid: validFiles, rejected };
		};

		const processFiles = (incoming: File[]) => {
			const { valid, rejected } = validateFiles(incoming);
			setRejectError(rejected);
			if (valid.length === 0) return;
			if (multiple) {
				onChange?.([...value, ...valid]);
			} else {
				onChange?.(valid);
			}
		};

		const handleDrop = (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			if (disabled) return;
			processFiles(Array.from(e.dataTransfer.files));
		};

		const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
			processFiles(Array.from(e.target.files || []));
			// Reset input
			if (inputRef.current) inputRef.current.value = '';
		};

		const handleRemove = (fileToRemove: File) => {
			const newFiles = value.filter(f => f !== fileToRemove);
			if (newFiles.length === 0) setRejectError('');
			onChange?.(newFiles);
		};

		const formatMaxSize = (bytes: number = maxSize) => {
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
			return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
		};

		return (
			<div className={cn('space-y-3', className)} {...props}>
				<div
					ref={ref}
					className={dropzoneVariants({ variant, size })}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					onClick={() => !disabled && inputRef.current?.click()}
				>
					<input
						ref={inputRef}
						type="file"
						accept={accept}
						multiple={multiple}
						onChange={handleFileSelect}
						disabled={disabled}
						className="hidden"
					/>
					{children || (
						<div className="text-center">
							<div className="mx-auto mb-3 text-muted-foreground">
								{displayError ? (
									<AlertCircle className="size-8" />
								) : (
									<Upload className="size-8" />
								)}
							</div>
							<p className="text-sm font-medium text-foreground">
								{displayError ? 'Upload gagal' : 'Tarik file ke sini atau klik untuk upload'}
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{accept && `Format: ${accept}`}
								{maxSize && ` • Maks: ${formatMaxSize()}`}
								{multiple && maxFiles > 1 && ` • Maks ${maxFiles} file`}
							</p>
						</div>
					)}
				</div>

				{displayError && (
					<p className="text-sm text-destructive flex items-center gap-1">
						<AlertCircle className="size-4" />
						{displayError}
					</p>
				)}

				{showPreview && value.length > 0 && (
					<div className="space-y-2">
						{value.map((file) => (
							<FilePreview
								key={`${file.name}-${file.size}-${file.lastModified}`}
								file={file}
								onRemove={() => handleRemove(file)}
								showPreview={showPreview}
							/>
						))}
					</div>
				)}
			</div>
		);
	}
);
FileUpload.displayName = 'FileUpload';

export { FileUpload, dropzoneVariants };
