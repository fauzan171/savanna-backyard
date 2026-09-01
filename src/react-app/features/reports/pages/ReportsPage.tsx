import { DollarSign, Car, CreditCard, BarChart3 } from 'lucide-react';
import { ReportCard } from '../components/ReportCard';

export default function ReportsPage() {
	const reports = [
		{
			title: 'Laporan Pendapatan',
			description: 'Pantau tren omzet dan rincian pembayaran',
			icon: <DollarSign className="h-5 w-5" />,
			href: '/reports/revenue',
		},
		{
			title: 'Utilisasi Kendaraan',
			description: 'Lihat pemakaian kendaraan dan ketersediaannya',
			icon: <Car className="h-5 w-5" />,
			href: '/reports/fleet',
		},
		{
			title: 'Laporan Pembayaran',
			description: 'Ringkasan status dan metode pembayaran',
			icon: <CreditCard className="h-5 w-5" />,
			href: '/reports/payments',
		},
		{
			title: 'Laporan Pelanggan',
			description: 'Retensi pelanggan dan pelanggan terbaik',
			icon: <BarChart3 className="h-5 w-5" />,
			href: '/reports/customers',
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Analisa performa bisnis dan buka laporan yang dibutuhkan
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{reports.map((report) => (
					<ReportCard
						key={report.href}
						title={report.title}
						description={report.description}
						icon={report.icon}
						href={report.href}
					/>
				))}
			</div>
		</div>
	);
}
