import { RouteObject } from 'react-router-dom';
import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';

// Layouts
import RootLayout from './layouts/RootLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from '@/react-app/features/auth/pages/LoginPage';
import DashboardPage from '@/react-app/features/dashboard/pages/DashboardPage';

export const routes: RouteObject[] = [
	{
		path: '/',
		element: <RootLayout />,
		children: [
			// Public auth routes (guest only)
			{
				element: <GuestGuard />,
				children: [
					{
						element: <AuthLayout />,
						children: [{ path: 'login', element: <LoginPage /> }],
					},
				],
			},

			// Protected routes
			{
				element: <AuthGuard />,
				children: [
					{
						element: <DashboardLayout />,
						children: [{ index: true, element: <DashboardPage /> }],
					},
				],
			},

			// 404 - redirect to dashboard or login
			{
				path: '*',
				element: <LoginPage />,
			},
		],
	},
];
