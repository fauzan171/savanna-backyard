import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload } from './file-upload';
import { useState } from 'react';

const meta = {
	title: 'UI/FileUpload',
	component: FileUpload,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof FileUpload>;

export default meta;

export const Default: Story = {
	render: function DefaultStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				value={files}
				onChange={setFiles}
				className="w-96"
			/>
		);
	},
};

export const ImageOnly: Story = {
	render: function ImageOnlyStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				accept="image/*"
				value={files}
				onChange={setFiles}
				className="w-96"
			/>
		);
	},
};

export const MultipleFiles: Story = {
	render: function MultipleFilesStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				multiple
				maxFiles={5}
				value={files}
				onChange={setFiles}
				className="w-96"
			/>
		);
	},
};

export const WithMaxSize: Story = {
	render: function WithMaxSizeStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				maxSize={1024 * 1024} // 1MB
				value={files}
				onChange={setFiles}
				className="w-96"
			/>
		);
	},
};

export const WithError: Story = {
	render: function WithErrorStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				error="File type not supported"
				value={files}
				onChange={setFiles}
				className="w-96"
			/>
		);
	},
};

export const Disabled: Story = {
	render: () => (
		<FileUpload
			disabled
			className="w-96"
		/>
	),
};

export const Small: Story = {
	render: function SmallStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				size="sm"
				value={files}
				onChange={setFiles}
				className="w-64"
			/>
		);
	},
};

export const Large: Story = {
	render: function LargeStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				size="lg"
				value={files}
				onChange={setFiles}
				className="w-[500px]"
			/>
		);
	},
};

export const PDFOnly: Story = {
	render: function PDFOnlyStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				accept=".pdf,application/pdf"
				value={files}
				onChange={setFiles}
				className="w-96"
			/>
		);
	},
};

export const WithCustomContent: Story = {
	render: function WithCustomContentStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				value={files}
				onChange={setFiles}
				className="w-96"
			>
				<div className="text-center">
					<div className="text-4xl mb-2">📁</div>
					<p className="text-sm font-medium">Drop your documents here</p>
					<p className="text-xs text-muted-foreground mt-1">
						Supports PDF, DOC, DOCX
					</p>
				</div>
			</FileUpload>
		);
	},
};

export const WithoutPreview: Story = {
	render: function WithoutPreviewStory() {
		const [files, setFiles] = useState<File[]>([]);

		return (
			<FileUpload
				value={files}
				onChange={setFiles}
				showPreview={false}
				className="w-96"
			/>
		);
	},
};
