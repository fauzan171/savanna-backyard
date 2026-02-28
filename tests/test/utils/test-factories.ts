/**
 * Test factory functions for creating test data
 */
import type { Customer, Vehicle, Lead, Booking, Payment, BookingAddon, User } from '@/worker/core/database/schema';

let idCounter = 0;
const generateId = () => `test-${++idCounter}-${Date.now()}`;

export function createTestCustomer(overrides: Partial<Customer> = {}): Customer {
	return {
		id: generateId(),
		name: 'Test Customer',
		phone: '+6281234567890',
		email: 'test@example.com',
		address: 'Test Address',
		identityType: 'KTP',
		identityNumber: '3171234567890001',
		identityPhotoUrl: null,
		notes: null,
		isBlacklisted: false,
		blacklistReason: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
	return {
		id: generateId(),
		name: 'Honda CRF 250L',
		plateNumber: `B ${Math.floor(Math.random() * 9999).toString().padStart(4, '0')} ABC`,
		type: 'TrailBike',
		brand: 'Honda',
		model: 'CRF 250L',
		year: 2023,
		dailyRateIdr: 450000,
		dailyRateUsd: 29,
		status: 'Available',
		totalKm: 1000,
		photoUrl: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestLead(overrides: Partial<Lead> = {}): Lead {
	return {
		id: generateId(),
		name: 'Test Lead',
		phone: '+6281234567891',
		email: 'lead@example.com',
		notes: null,
		source: 'WhatsApp',
		status: 'New',
		priority: 'Warm',
		assignedTo: null,
		followUpDate: null,
		convertedAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestVehicleStatusLog(overrides: Record<string, unknown> = {}) {
	return {
		id: generateId(),
		vehicleId: 'test-vehicle-id',
		statusFrom: 'Available' as const,
		statusTo: 'Rented' as const,
		notes: null,
		recordedBy: 'test-user-id',
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestBooking(overrides: Partial<Booking> = {}): Booking {
	const id = generateId();
	const date = new Date();
	const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
	return {
		id,
		bookingNumber: `SM-${dateStr}-TEST${idCounter}`,
		customerId: 'test-customer-id',
		vehicleId: 'test-vehicle-id',
		startDate: '2026-03-05',
		endDate: '2026-03-08',
		actualReturnDate: null,
		startKm: null,
		endKm: null,
		status: 'Pending',
		paymentTerms: 'DP_Pickup',
		baseAmount: 1350000,
		addonsAmount: 0,
		lateFee: 0,
		totalAmount: 1350000,
		currency: 'IDR',
		notes: null,
		createdBy: 'test-user-id',
		cancelledAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestPayment(overrides: Partial<Payment> = {}): Payment {
	return {
		id: generateId(),
		bookingId: 'test-booking-id',
		amount: 500000,
		currency: 'IDR',
		method: 'QRIS',
		status: 'Pending',
		transactionReference: `TXN-${Date.now()}`,
		verifiedBy: null,
		verifiedAt: null,
		notes: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestAddon(overrides: Partial<BookingAddon> = {}): BookingAddon {
	return {
		id: generateId(),
		bookingId: 'test-booking-id',
		type: 'SafetyGear',
		description: 'Helmet and jacket',
		amount: 100000,
		isMandatory: true,
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

export function createTestUser(overrides: Partial<User> = {}): User {
	return {
		id: generateId(),
		name: 'Test User',
		email: 'test@example.com',
		passwordHash: 'hashed-password',
		role: 'STAFF',
		isActive: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		...overrides,
	};
}
