import { Hono, Context } from 'hono';
import { createDb } from '@/worker/core/database';
import { EmailService } from '@/worker/core/services/email.service';
import { bookings, customers, vehicles } from '@/worker/core/database/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { validateBody } from '@/worker/core/middleware/validator';
import { sendEmailSchema, sendReminderSchema, type SendEmailRequest, type SendReminderRequest } from './emails.dto';
import { NotFoundError, ValidationError } from '@/worker/core/types/errors';

type EmailsEnv = { Bindings: Env; Variables: { user: { userId: string; role: string } } };

/**
 * Admin email API routes.
 * Allows admin to send emails to customers from the dashboard.
 */
export function createEmailsRouter(): Hono<EmailsEnv> {
	const router = new Hono<EmailsEnv>();

	// Apply auth middleware to all routes
	router.use('*', authMiddleware());

	/**
	 * POST /emails/send
	 * Send custom email to customer.
	 */
	router.post('/send', validateBody(sendEmailSchema), async (c: Context<EmailsEnv>) => {
		const body = getValidatedBody<SendEmailRequest>(c);

		// Initialize email service
		if (!c.env.RESEND_API_KEY) {
			return c.json({
				success: false,
				message: 'Email service not configured',
				error: { code: 'CONFIG_ERROR', message: 'RESEND_API_KEY not set' },
			}, 500);
		}

		const emailService = new EmailService({
			apiKey: c.env.RESEND_API_KEY,
			fromEmail: c.env.EMAIL_FROM ?? 'Savanna Bromo <noreply@savannabromo.com>',
		});

		// Send email
		const sent = await emailService.sendCustomEmail(body.to, body.subject, body.message);

		if (!sent) {
			return c.json({
				success: false,
				message: 'Failed to send email',
				error: { code: 'EMAIL_ERROR', message: 'Failed to send email via Resend' },
			}, 500);
		}

		return c.json({
			success: true,
			message: 'Email sent successfully',
			data: {
				to: body.to,
				subject: body.subject,
			},
		});
	});

	/**
	 * POST /emails/send-reminder
	 * Send booking reminder email to customer.
	 */
	router.post('/send-reminder', validateBody(sendReminderSchema), async (c: Context<EmailsEnv>) => {
		const body = getValidatedBody<SendReminderRequest>(c);

		// Initialize email service
		if (!c.env.RESEND_API_KEY) {
			return c.json({
				success: false,
				message: 'Email service not configured',
				error: { code: 'CONFIG_ERROR', message: 'RESEND_API_KEY not set' },
			}, 500);
		}

		const emailService = new EmailService({
			apiKey: c.env.RESEND_API_KEY,
			fromEmail: c.env.EMAIL_FROM ?? 'Savanna Bromo <noreply@savannabromo.com>',
		});

		// Fetch booking with customer and vehicle
		const db = createDb(c.env.DB);

		const bookingResult = await db
			.select()
			.from(bookings)
			.where(eq(bookings.id, body.bookingId))
			.limit(1);

		if (bookingResult.length === 0) {
			throw new NotFoundError('Booking not found');
		}

		const booking = bookingResult[0]!;

		// Fetch customer
		const customerResult = await db
			.select()
			.from(customers)
			.where(eq(customers.id, booking.customerId))
			.limit(1);

		const customer = customerResult[0];

		if (!customer?.email) {
			throw new ValidationError('Customer email not available');
		}

		// Fetch vehicle
		const vehicleResult = await db
			.select()
			.from(vehicles)
			.where(eq(vehicles.id, booking.vehicleId))
			.limit(1);

		const vehicle = vehicleResult[0];

		// Send reminder email
		const sent = await emailService.sendBookingReminder({
			customerName: customer.name,
			customerEmail: customer.email,
			bookingNumber: booking.bookingNumber,
			vehicleName: vehicle?.name ?? 'Unknown Vehicle',
			startDate: booking.startDate,
			endDate: booking.endDate,
			pickupTime: body.pickupTime ?? '08:00 - 10:00 WIB',
			pickupLocation: body.pickupLocation ?? 'Kantor Savanna Bromo Rental',
		});

		if (!sent) {
			return c.json({
				success: false,
				message: 'Failed to send reminder email',
				error: { code: 'EMAIL_ERROR', message: 'Failed to send email via Resend' },
			}, 500);
		}

		return c.json({
			success: true,
			message: 'Reminder email sent successfully',
			data: {
				bookingNumber: booking.bookingNumber,
				customerEmail: customer.email,
			},
		});
	});

	/**
	 * GET /emails/status
	 * Check if email service is configured.
	 */
	router.get('/status', async (c: Context<EmailsEnv>) => {
		const isConfigured = !!c.env.RESEND_API_KEY;

		return c.json({
			success: true,
			data: {
				configured: isConfigured,
				provider: 'resend',
				fromEmail: c.env.EMAIL_FROM ?? 'Savanna Bromo <noreply@savannabromo.com>',
			},
		});
	});

	return router;
}

// Helper function to get validated body from context
function getValidatedBody<T>(c: Context): T {
	return c.get('validatedBody') as T;
}
