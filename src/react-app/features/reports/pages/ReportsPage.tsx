import { DollarSign, Car, Users, CreditCard, BarChart3 } from 'lucide-react';
import { ReportCard } from '../components/ReportCard';

export default function ReportsPage() {
	const reports = [
		{
			title: 'Revenue Report',
			description: 'Track revenue trends and payment breakdown',
			icon: <DollarSign className="h-5 w-5" />,
			href: '/reports/revenue',
		},
		{
			title: 'Fleet Utilization',
			description: 'Analyze vehicle usage and availability',
			icon: <Car className="h-5 w-5" />,
			href: '/reports/fleet',
		},
		{
			title: 'Lead Sources',
			description: 'Track lead conversion by source',
			icon: <Users className="h-5 w-5" />,
			href: '/reports/leads',
		},
		{
			title: 'Payment Report',
			description: 'Payment status and method breakdown',
			icon: <CreditCard className="h-5 w-5" />,
			href: '/reports/payments',
		},
		{
			title: 'Customer Report',
			description: 'Customer retention and top customers',
			icon: <BarChart3 className="h-5 w-5" />,
			href: '/reports/customers',
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Analyze your business performance and generate reports
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
