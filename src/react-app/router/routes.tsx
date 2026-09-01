import { RouteObject } from 'react-router-dom';
import { AuthGuard } from './guards/AuthGuard';
import { GuestGuard } from './guards/GuestGuard';
import { RoleGuard } from './guards/RoleGuard';

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
import { VehicleAvailabilityPage } from '@/react-app/features/vehicles';

// Calendar Page
import { CalendarPage } from '@/react-app/features/calendar';

// Booking Pages
import { BookingsPage, BookingDetailPage } from '@/react-app/features/bookings';

// Payment Pages
import { PaymentsPage, PaymentDetailPage, PaymentDashboardPage } from '@/react-app/features/payments';

// Equipment Pages
import { EquipmentPage, EquipmentDetailPage } from '@/react-app/features/equipment';

// Maintenance Pages
import { MaintenancePage, MaintenanceDetailPage } from '@/react-app/features/maintenance';

// Reports Pages
import {
	ReportsPage,
	RevenueReportPage,
	FleetReportPage,
	PaymentReportPage,
	CustomerReportPage,
} from '@/react-app/features/reports';

// Content Management Pages
import { PackagesPage, PackageDetailPage } from '@/react-app/features/packages';
import { PricingPage, PricingDetailPage } from '@/react-app/features/pricing';
import { ReviewsPage, ReviewDetailPage } from '@/react-app/features/reviews';
import { TrailsPage, TrailDetailPage } from '@/react-app/features/trails';
import SettingsPage from '@/react-app/features/settings/pages/SettingsPage';
import UsersPage from '@/react-app/features/users/pages/UsersPage';
import { OtpLogsPage } from '@/react-app/features/otp';

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

							// Vehicle routes
							{ path: 'vehicles', element: <VehiclesPage /> },
							{ path: 'vehicles/availability', element: <VehicleAvailabilityPage /> },
							{ path: 'vehicles/:id', element: <VehicleDetailPage /> },

							// Fleet calendar matrix
							{ path: 'calendar', element: <CalendarPage /> },

							// Booking routes
							{ path: 'bookings', element: <BookingsPage /> },
							{ path: 'bookings/:id', element: <BookingDetailPage /> },

							// Equipment routes
							{ path: 'equipment', element: <EquipmentPage /> },
							{ path: 'equipment/:id', element: <EquipmentDetailPage /> },

							// Maintenance routes
							{ path: 'maintenance', element: <MaintenancePage /> },
							{ path: 'maintenance/:id', element: <MaintenanceDetailPage /> },

							{
								element: <RoleGuard allowedRoles={['SUPER_ADMIN']} />,
								children: [
									// Customer routes
									{ path: 'customers', element: <CustomersPage /> },
									{ path: 'customers/:id', element: <CustomerDetailPage /> },

									// Payment routes
									{ path: 'payments', element: <PaymentsPage /> },
									{ path: 'payments/dashboard', element: <PaymentDashboardPage /> },
									{ path: 'payments/:id', element: <PaymentDetailPage /> },

									// Reports routes
									{ path: 'reports', element: <ReportsPage /> },
									{ path: 'reports/revenue', element: <RevenueReportPage /> },
									{ path: 'reports/fleet', element: <FleetReportPage /> },
									{ path: 'reports/payments', element: <PaymentReportPage /> },
									{ path: 'reports/customers', element: <CustomerReportPage /> },

									// Content management routes
									{ path: 'packages', element: <PackagesPage /> },
									{ path: 'packages/:id', element: <PackageDetailPage /> },
									{ path: 'pricing', element: <PricingPage /> },
									{ path: 'pricing/:id', element: <PricingDetailPage /> },
									{ path: 'reviews', element: <ReviewsPage /> },
									{ path: 'reviews/:id', element: <ReviewDetailPage /> },
									{ path: 'trails', element: <TrailsPage /> },
									{ path: 'trails/:id', element: <TrailDetailPage /> },
									{ path: 'settings', element: <SettingsPage /> },
									{ path: 'users', element: <UsersPage /> },
									{ path: 'otp', element: <OtpLogsPage /> },
								],
							},
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
