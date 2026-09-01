import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { PageHeader } from '@/react-app/components/layout/page-header';
import { useSettings, useBulkUpdateSettings } from '../hooks/useSettings';
import { toast } from '@/react-app/hooks/useToast';
import { extractApiError } from '@/react-app/lib/extract-error';
import type { Setting } from '../api/settings';

const SETTING_GROUPS = [
	{
		title: 'Informasi Kontak',
		keys: ['contact_email', 'contact_phone', 'whatsapp_number', 'location', 'instagram_url'],
		labels: { contact_email: 'Email Kontak', contact_phone: 'Telepon Kontak', whatsapp_number: 'Nomor WhatsApp', location: 'Lokasi', instagram_url: 'URL Instagram' },
		types: { contact_email: 'email', contact_phone: 'tel', whatsapp_number: 'tel', instagram_url: 'url' },
	},
	{
		title: 'Rekening Bank (Transfer Manual)',
		keys: ['bank_name', 'bank_account_number', 'bank_account_holder'],
		labels: { bank_name: 'Nama Bank', bank_account_number: 'Nomor Rekening', bank_account_holder: 'Nama Pemilik Rekening' },
	},
	{
		title: 'Deposit',
		keys: ['deposit_amount', 'deposit_description'],
		labels: { deposit_amount: 'Nominal Deposit (IDR)', deposit_description: 'Deskripsi Deposit' },
	},
];

export default function SettingsPage() {
	const { data: settings, isLoading } = useSettings();
	const bulkUpdate = useBulkUpdateSettings();
	const [formValues, setFormValues] = useState<Record<string, string>>({});

	useEffect(() => {
		if (settings) {
			const map: Record<string, string> = {};
			settings.forEach((s: Setting) => { map[s.key] = s.value; });
			setFormValues(map);
		}
	}, [settings]);

	const handleSave = async () => {
		const updates = Object.entries(formValues).map(([key, value]) => ({ key, value }));
		try {
			await bulkUpdate.mutateAsync(updates);
			toast({ title: 'Pengaturan tersimpan' });
		} catch (error) {
			toast({
				title: 'Gagal menyimpan',
				description: extractApiError(error),
				variant: 'destructive',
			});
		}
	};

	if (isLoading) return <div className="text-center py-8 text-muted-foreground">Memuat pengaturan...</div>;

	return (
		<div className="space-y-6">
			<PageHeader title="Pengaturan" description="Kelola informasi website, kontak, rekening, dan deposit" actions={
				<Button onClick={handleSave} disabled={bulkUpdate.isPending}>
					{bulkUpdate.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
					Simpan Semua
				</Button>
			} />

			<div className="space-y-8">
				{SETTING_GROUPS.map((group) => (
					<div key={group.title} className="bg-card border rounded-lg p-6">
						<h3 className="font-semibold mb-4">{group.title}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{group.keys.map((key) => (
								<div key={key}>
									<label className="text-sm font-medium">{(group.labels as any)[key] ?? key}</label>
									<Input
										type={(group.types as any)?.[key] ?? 'text'}
										value={formValues[key] ?? ''}
										onChange={(e) => setFormValues(prev => ({ ...prev, [key]: e.target.value }))}
									/>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
