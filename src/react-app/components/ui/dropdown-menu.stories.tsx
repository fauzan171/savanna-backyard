import type { Meta, StoryObj } from '@storybook/react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from './dropdown-menu';
import { Button } from './button';
import { User, Settings, LogOut, CreditCard, Mail, Plus, Edit, Trash2, MoreHorizontal, Copy } from 'lucide-react';

const meta = {
	title: 'UI/DropdownMenu',
	component: DropdownMenu,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
} satisfies Meta<typeof DropdownMenu>;

export default meta;

export const Default: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Open Menu</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>My Account</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<User className="mr-2 size-4" />
					Profile
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Settings className="mr-2 size-4" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuItem>
					<CreditCard className="mr-2 size-4" />
					Billing
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 size-4" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithShortcuts: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Shortcuts</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>
					Copy
					<DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					Cut
					<DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					Paste
					<DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithCheckboxItems: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Status</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem checked>Pending</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem>Confirmed</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem>Active</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem>Completed</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithRadioItems: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Priority</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Set Priority</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value="medium">
					<DropdownMenuRadioItem value="high">High</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="low">Low</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithSubmenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">More Options</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>
					<Copy className="mr-2 size-4" />
					Copy
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Plus className="mr-2 size-4" />
						Add to
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem>Team</DropdownMenuItem>
						<DropdownMenuItem>Project</DropdownMenuItem>
						<DropdownMenuItem>Folder</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Trash2 className="mr-2 size-4" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const TableRowActions: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<MoreHorizontal className="size-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem>
					<Edit className="mr-2 size-4" />
					Edit
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Copy className="mr-2 size-4" />
					Duplicate
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="text-destructive">
					<Trash2 className="mr-2 size-4" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const DisabledItems: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Menu</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem>Enabled</DropdownMenuItem>
				<DropdownMenuItem disabled>Disabled</DropdownMenuItem>
				<DropdownMenuItem>Enabled</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithGroups: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Actions</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>New</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Plus className="mr-2 size-4" />
						New Booking
					</DropdownMenuItem>
					<DropdownMenuItem>
						<User className="mr-2 size-4" />
						New Customer
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Communication</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Mail className="mr-2 size-4" />
						Send Email
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};
