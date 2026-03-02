import { RouteObject } from 'react-router-dom';
import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';

// Layouts
import RootLayout from './layouts/RootLayout';
import DashboardLayout from '@/react-app/components/layout/dashboard-layout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from '@/react-app/features/auth/pages/LoginPage';

// Dashboard Pages
import DashboardPage from '@/react-app/features/dashboard/pages/DashboardPage';

// Customer Pages
import CustomersPage from '@/react-app/features/customers/pages/CustomersPage';
import CustomerDetailPage from '@/react-app/features/customers/pages/CustomerDetailPage';

// Vehicle Pages
import VehiclesPage from '@/react-app/features/vehicles/pages/VehiclesPage';
import VehicleDetailPage from '@/react-app/features/vehicles/pages/VehicleDetailPage';

// Leads Pages
import LeadsPage from '@/react-app/features/leads/pages/LeadsPage';
import LeadDetailPage from '@/react-app/features/leads/pages/LeadDetailPage';

// Booking Pages
import { BookingsPage, BookingDetailPage } from '@/react-app/features/bookings';

// Payment Pages
import { PaymentsPage, PaymentDetailPage } from '@/react-app/features/payments';

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
						children: [
							{ index: true, element: <DashboardPage /> },

							// Customer routes
							{ path: 'customers', element: <CustomersPage /> },
							{ path: 'customers/:id', element: <CustomerDetailPage /> },

							// Vehicle routes
							{ path: 'vehicles', element: <VehiclesPage /> },
							{ path: 'vehicles/:id', element: <VehicleDetailPage /> },

							// Leads routes
							{ path: 'leads', element: <LeadsPage /> },
							{ path: 'leads/:id', element: <LeadDetailPage /> },

							// Booking routes
							{ path: 'bookings', element: <BookingsPage /> },
							{ path: 'bookings/:id', element: <BookingDetailPage /> },

							// Payment routes
							{ path: 'payments', element: <PaymentsPage /> },
							{ path: 'payments/:id', element: <PaymentDetailPage /> },
						],
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
