import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';
import { Label } from './label';
import { useState } from 'react';

const meta = {
	title: 'UI/Switch',
	component: Switch,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
		},
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Checked: Story = {
	args: {
		checked: true,
	},
};

export const Small: Story = {
	args: {
		size: 'sm',
	},
};

export const Large: Story = {
	args: {
		size: 'lg',
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		disabled: true,
		checked: true,
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-3">
			<Switch id="dark-mode" />
			<Label htmlFor="dark-mode">Dark mode</Label>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Switch size="sm" checked />
			<Switch size="md" checked />
			<Switch size="lg" checked />
		</div>
	),
};

export const Interactive: Story = {
	render: function InteractiveSwitch() {
		const [enabled, setEnabled] = useState(false);

		return (
			<div className="flex items-center gap-3">
				<Switch
					id="notifications"
					checked={enabled}
					onCheckedChange={setEnabled}
				/>
				<Label htmlFor="notifications">
					Notifications {enabled ? 'enabled' : 'disabled'}
				</Label>
			</div>
		);
	},
};

export const SettingsPanel: Story = {
	render: function SettingsPanel() {
		const [settings, setSettings] = useState({
			email: true,
			push: false,
			sms: false,
		});

		return (
			<div className="space-y-4 w-64">
				<div className="flex items-center justify-between">
					<Label htmlFor="email">Email notifications</Label>
					<Switch
						id="email"
						checked={settings.email}
						onCheckedChange={(checked) =>
							setSettings({ ...settings, email: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<Label htmlFor="push">Push notifications</Label>
					<Switch
						id="push"
						checked={settings.push}
						onCheckedChange={(checked) =>
							setSettings({ ...settings, push: checked })
						}
					/>
				</div>
				<div className="flex items-center justify-between">
					<Label htmlFor="sms">SMS notifications</Label>
					<Switch
						id="sms"
						checked={settings.sms}
						onCheckedChange={(checked) =>
							setSettings({ ...settings, sms: checked })
						}
					/>
				</div>
			</div>
		);
	},
};
