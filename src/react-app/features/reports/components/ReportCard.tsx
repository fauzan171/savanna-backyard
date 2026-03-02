import { Link } from 'react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardActions } from '@/react-app/components/ui/card';
import { Button } from '@/react-app/components/ui/button';

interface ReportCardProps {
	title: string;
	description: string;
	icon: React.ReactNode;
	href: string;
	summary?: {
		label: string;
		value: string | number;
	};
}

export function ReportCard({ title, description, icon, href, summary }: ReportCardProps) {
	return (
		<Card className="transition-all hover:shadow-md">
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
						{icon}
					</div>
					<div>
						<CardTitle className="text-base">{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
				</div>
			</CardHeader>
			{summary && (
				<CardContent>
					<div className="text-sm text-muted-foreground">{summary.label}</div>
					<div className="text-2xl font-bold">{summary.value}</div>
				</CardContent>
			)}
			<CardActions className="p-6 pt-0">
				<Button variant="outline" asChild>
					<Link to={href}>View Report</Link>
				</Button>
			</CardActions>
		</Card>
	);
}
