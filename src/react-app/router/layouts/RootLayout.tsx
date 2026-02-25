import { Outlet } from 'react-router-dom';
import { Toaster } from '@/react-app/components/ui/sonner';

export default function RootLayout() {
	return (
		<>
			<Outlet />
			<Toaster />
		</>
	);
}
