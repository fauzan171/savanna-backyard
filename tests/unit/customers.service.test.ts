import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomersService } from '@/worker/modules/customers/customers.service';
import { CustomersRepository } from '@/worker/modules/customers/customers.repository';
import { ConflictError, NotFoundError } from '@/worker/core/types/errors';
import { createTestCustomer } from '@test/utils';

describe('CustomersService', () => {
	let customersService: CustomersService;
	let mockCustomerRepo: CustomersRepository;

	beforeEach(() => {
		// Create mock repository
		mockCustomerRepo = {
			findById: vi.fn(),
			findByPhone: vi.fn(),
			findByEmail: vi.fn(),
			list: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			setBlacklist: vi.fn(),
			checkExists: vi.fn(),
		} as unknown as CustomersRepository;

		customersService = new CustomersService(mockCustomerRepo);
	});

	describe('list', () => {
		// ============================================
		// P0: Happy Path - Critical business scenarios
		// ============================================

		it('[P0] should list customers with pagination', async () => {
			const mockCustomers = [
				createTestCustomer({ name: 'John Doe' }),
				createTestCustomer({ name: 'Jane Smith' }),
			];

			vi.mocked(mockCustomerRepo.list).mockResolvedValue({
				items: mockCustomers,
				total: 2,
			});

			const result = await customersService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(2);
			expect(result.meta.page).toBe(1);
			expect(result.meta.limit).toBe(25);
			expect(result.meta.total).toBe(2);
			expect(result.meta.totalPages).toBe(1);
		});

		it('[P0] should calculate totalPages correctly', async () => {
			vi.mocked(mockCustomerRepo.list).mockResolvedValue({
				items: [],
				total: 100,
			});

			const result = await customersService.list({ page: 1, limit: 25 });

			expect(result.meta.totalPages).toBe(4);
		});

		it('[P0] should filter by blacklist status', async () => {
			const blacklistedCustomer = createTestCustomer({ isBlacklisted: true });
			vi.mocked(mockCustomerRepo.list).mockResolvedValue({
				items: [blacklistedCustomer],
				total: 1,
			});

			const result = await customersService.list({ page: 1, limit: 25, blacklist: true });

			expect(mockCustomerRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				blacklist: true,
			});
			expect(result.items).toHaveLength(1);
			expect(result.items[0].isBlacklisted).toBe(true);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle empty result set', async () => {
			vi.mocked(mockCustomerRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			const result = await customersService.list({ page: 1, limit: 25 });

			expect(result.items).toHaveLength(0);
			expect(result.meta.total).toBe(0);
			expect(result.meta.totalPages).toBe(0);
		});

		it('[P1] should handle search with special characters', async () => {
			vi.mocked(mockCustomerRepo.list).mockResolvedValue({
				items: [],
				total: 0,
			});

			await customersService.list({ page: 1, limit: 25, search: "O'Brien" });

			expect(mockCustomerRepo.list).toHaveBeenCalledWith({
				page: 1,
				limit: 25,
				search: "O'Brien",
			});
		});

		it('[P1] should handle large page numbers', async () => {
			vi.mocked(mockCustomerRepo.list).mockResolvedValue({
				items: [],
				total: 100,
			});

			const result = await customersService.list({ page: 100, limit: 25 });

			expect(result.meta.page).toBe(100);
			expect(mockCustomerRepo.list).toHaveBeenCalledWith(
				expect.objectContaining({ page: 100 })
			);
		});
	});

	describe('getById', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return customer with rental history', async () => {
			const mockCustomer = createTestCustomer();
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(mockCustomer);

			const result = await customersService.getById(mockCustomer.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(mockCustomer.id);
			expect(result?.name).toBe(mockCustomer.name);
			expect(result?.rentalHistory).toEqual([]);
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null when customer not found', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

			const result = await customersService.getById('nonexistent-id');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return blacklisted customer details', async () => {
			const blacklistedCustomer = createTestCustomer({
				isBlacklisted: true,
				blacklistReason: 'Damaged vehicle',
			});
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(blacklistedCustomer);

			const result = await customersService.getById(blacklistedCustomer.id);

			expect(result?.isBlacklisted).toBe(true);
			expect(result?.blacklistReason).toBe('Damaged vehicle');
		});

		it('[P1] should handle customer with all optional fields null', async () => {
			const minimalCustomer = createTestCustomer({
				email: null,
				address: null,
				identityType: null,
				identityNumber: null,
				identityPhotoUrl: null,
				notes: null,
			});
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(minimalCustomer);

			const result = await customersService.getById(minimalCustomer.id);

			expect(result?.email).toBeNull();
			expect(result?.address).toBeNull();
			expect(result?.identityType).toBeNull();
		});
	});

	describe('create', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should create customer with valid data', async () => {
			const newCustomer = createTestCustomer();
			vi.mocked(mockCustomerRepo.findByEmail).mockResolvedValue(null);
			vi.mocked(mockCustomerRepo.create).mockResolvedValue(newCustomer);

			const result = await customersService.create({
				name: 'Test Customer',
				phone: '+6281234567890',
				email: 'test@example.com',
			});

			expect(result.name).toBe('Test Customer');
			expect(result.phone).toBe('+6281234567890');
			expect(mockCustomerRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test Customer',
					phone: '+6281234567890',
					isBlacklisted: false,
				})
			);
		});

		it('[P0] should create customer without email', async () => {
			const newCustomer = createTestCustomer({ email: null });
			vi.mocked(mockCustomerRepo.create).mockResolvedValue(newCustomer);

			const result = await customersService.create({
				name: 'Test Customer',
				phone: '+6281234567890',
			});

			expect(result).toBeDefined();
			expect(mockCustomerRepo.findByEmail).not.toHaveBeenCalled();
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw ConflictError when email already exists', async () => {
			const existingCustomer = createTestCustomer({ email: 'existing@example.com' });
			vi.mocked(mockCustomerRepo.findByEmail).mockResolvedValue(existingCustomer);

			await expect(
				customersService.create({
					name: 'New Customer',
					phone: '+6281234567899',
					email: 'existing@example.com',
				})
			).rejects.toThrow(ConflictError);

			await expect(
				customersService.create({
					name: 'New Customer',
					phone: '+6281234567899',
					email: 'existing@example.com',
				})
			).rejects.toThrow('Email already exists');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should create customer with all optional fields', async () => {
			const fullCustomer = createTestCustomer({
				identityType: 'KTP',
				identityNumber: '3171234567890001',
				identityPhotoUrl: 'https://example.com/ktp.jpg',
				notes: 'VIP customer',
				address: 'Jl. Sudirman No. 123',
			});
			vi.mocked(mockCustomerRepo.findByEmail).mockResolvedValue(null);
			vi.mocked(mockCustomerRepo.create).mockResolvedValue(fullCustomer);

			const result = await customersService.create({
				name: 'Test Customer',
				phone: '+6281234567890',
				email: 'test@example.com',
				address: 'Jl. Sudirman No. 123',
				identityType: 'KTP',
				identityNumber: '3171234567890001',
				identityPhotoUrl: 'https://example.com/ktp.jpg',
				notes: 'VIP customer',
			});

			expect(result.identityType).toBe('KTP');
			expect(result.identityNumber).toBe('3171234567890001');
		});

		it('[P1] should default isBlacklisted to false', async () => {
			const newCustomer = createTestCustomer();
			vi.mocked(mockCustomerRepo.create).mockResolvedValue(newCustomer);

			await customersService.create({
				name: 'Test Customer',
				phone: '+6281234567890',
			});

			expect(mockCustomerRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					isBlacklisted: false,
					blacklistReason: null,
				})
			);
		});

		it('[P1] should reject duplicate phone (CUST-03/CUST-06/CUST-E03)', async () => {
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(createTestCustomer({ phone: '+6281234567890' }));
			await expect(
				customersService.create({ name: 'Dup', phone: '+6281234567890' })
			).rejects.toThrow('Nomor telepon sudah terdaftar');
			expect(mockCustomerRepo.create).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should update customer successfully', async () => {
			const existingCustomer = createTestCustomer();
			const updatedCustomer = { ...existingCustomer, name: 'Updated Name' };

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(existingCustomer);
			vi.mocked(mockCustomerRepo.update).mockResolvedValue(updatedCustomer);

			const result = await customersService.update(existingCustomer.id, {
				name: 'Updated Name',
			});

			expect(result.name).toBe('Updated Name');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when customer not found', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

			await expect(
				customersService.update('nonexistent-id', { name: 'New Name' })
			).rejects.toThrow(NotFoundError);
		});

		it('[P0] should throw ConflictError when updating to existing email', async () => {
			const existingCustomer = createTestCustomer({ email: 'old@example.com' });
			const otherCustomer = createTestCustomer({ email: 'taken@example.com' });

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(existingCustomer);
			vi.mocked(mockCustomerRepo.findByEmail).mockResolvedValue(otherCustomer);

			await expect(
				customersService.update(existingCustomer.id, { email: 'taken@example.com' })
			).rejects.toThrow(ConflictError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should allow updating to same email', async () => {
			const existingCustomer = createTestCustomer({ email: 'same@example.com' });
			const updatedCustomer = { ...existingCustomer, name: 'New Name' };

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(existingCustomer);
			vi.mocked(mockCustomerRepo.update).mockResolvedValue(updatedCustomer);

			const result = await customersService.update(existingCustomer.id, {
				name: 'New Name',
				email: 'same@example.com',
			});

			expect(result).toBeDefined();
			expect(mockCustomerRepo.findByEmail).not.toHaveBeenCalled();
		});

		it('[P1] should allow clearing email (set to null)', async () => {
			const existingCustomer = createTestCustomer({ email: 'old@example.com' });
			const updatedCustomer = { ...existingCustomer, email: null };

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(existingCustomer);
			vi.mocked(mockCustomerRepo.update).mockResolvedValue(updatedCustomer);

			const result = await customersService.update(existingCustomer.id, {
				email: null,
			});

			expect(result.email).toBeNull();
		});
	});

	describe('setBlacklist', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should blacklist customer with reason', async () => {
			const existingCustomer = createTestCustomer();
			const blacklistedCustomer = {
				...existingCustomer,
				isBlacklisted: true,
				blacklistReason: 'Damaged vehicle',
			};

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(existingCustomer);
			vi.mocked(mockCustomerRepo.setBlacklist).mockResolvedValue(blacklistedCustomer);

			const result = await customersService.setBlacklist(existingCustomer.id, {
				isBlacklisted: true,
				reason: 'Damaged vehicle',
			});

			expect(result.isBlacklisted).toBe(true);
			expect(result.blacklistReason).toBe('Damaged vehicle');
			expect(mockCustomerRepo.setBlacklist).toHaveBeenCalledWith(
				existingCustomer.id,
				true,
				'Damaged vehicle'
			);
		});

		it('[P0] should remove customer from blacklist', async () => {
			const blacklistedCustomer = createTestCustomer({
				isBlacklisted: true,
				blacklistReason: 'Previous issue',
			});
			const unblacklistedCustomer = {
				...blacklistedCustomer,
				isBlacklisted: false,
				blacklistReason: null,
			};

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(blacklistedCustomer);
			vi.mocked(mockCustomerRepo.setBlacklist).mockResolvedValue(unblacklistedCustomer);

			const result = await customersService.setBlacklist(blacklistedCustomer.id, {
				isBlacklisted: false,
				reason: null,
			});

			expect(result.isBlacklisted).toBe(false);
			expect(result.blacklistReason).toBeNull();
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should throw NotFoundError when customer not found', async () => {
			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

			await expect(
				customersService.setBlacklist('nonexistent-id', {
					isBlacklisted: true,
					reason: 'Test reason',
				})
			).rejects.toThrow(NotFoundError);
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should handle long blacklist reason', async () => {
			const existingCustomer = createTestCustomer();
			const longReason = 'A'.repeat(500);
			const blacklistedCustomer = {
				...existingCustomer,
				isBlacklisted: true,
				blacklistReason: longReason,
			};

			vi.mocked(mockCustomerRepo.findById).mockResolvedValue(existingCustomer);
			vi.mocked(mockCustomerRepo.setBlacklist).mockResolvedValue(blacklistedCustomer);

			const result = await customersService.setBlacklist(existingCustomer.id, {
				isBlacklisted: true,
				reason: longReason,
			});

			expect(result.blacklistReason).toBe(longReason);
		});
	});

	describe('findByPhone', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should find customer by phone', async () => {
			const mockCustomer = createTestCustomer({ phone: '+6281234567890' });
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(mockCustomer);

			const result = await customersService.findByPhone('+6281234567890');

			expect(result).not.toBeNull();
			expect(result?.phone).toBe('+6281234567890');
		});

		// ============================================
		// P0: Error Cases
		// ============================================

		it('[P0] should return null when phone not found', async () => {
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(null);

			const result = await customersService.findByPhone('+6289999999999');

			expect(result).toBeNull();
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should return basic info only', async () => {
			const mockCustomer = createTestCustomer({
				phone: '+6281234567890',
				isBlacklisted: true,
			});
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(mockCustomer);

			const result = await customersService.findByPhone('+6281234567890');

			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('name');
			expect(result).toHaveProperty('phone');
			expect(result).toHaveProperty('isBlacklisted');
			// Should not have all fields
			expect(result).not.toHaveProperty('email');
			expect(result).not.toHaveProperty('address');
		});

		it('[P1] should handle different phone formats', async () => {
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(null);

			await customersService.findByPhone('081234567890'); // Local format
			await customersService.findByPhone('+62 812-3456-7890'); // With spaces/dashes

			expect(mockCustomerRepo.findByPhone).toHaveBeenCalledWith('081234567890');
			expect(mockCustomerRepo.findByPhone).toHaveBeenCalledWith('+62 812-3456-7890');
		});
	});

	describe('checkExists', () => {
		it('[P0] should return true when customer exists', async () => {
			vi.mocked(mockCustomerRepo.checkExists).mockResolvedValue(true);

			const result = await customersService.checkExists('existing-id');

			expect(result).toBe(true);
		});

		it('[P0] should return false when customer not found', async () => {
			vi.mocked(mockCustomerRepo.checkExists).mockResolvedValue(false);

			const result = await customersService.checkExists('nonexistent-id');

			expect(result).toBe(false);
		});
	});

	describe('findOrCreateByPhone', () => {
		// ============================================
		// P0: Happy Path
		// ============================================

		it('[P0] should return existing customer if found', async () => {
			const existingCustomer = createTestCustomer({ phone: '+6281234567890' });
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(existingCustomer);

			const result = await customersService.findOrCreateByPhone('+6281234567890', 'New Name');

			expect(result.id).toBe(existingCustomer.id);
			expect(result.name).toBe(existingCustomer.name);
			expect(mockCustomerRepo.create).not.toHaveBeenCalled();
		});

		it('[P0] should create new customer if not found', async () => {
			const newCustomer = createTestCustomer({ phone: '+6281234567890', name: 'New Name' });
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(null);
			vi.mocked(mockCustomerRepo.create).mockResolvedValue(newCustomer);

			const result = await customersService.findOrCreateByPhone('+6281234567890', 'New Name');

			expect(mockCustomerRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					phone: '+6281234567890',
					name: 'New Name',
				})
			);
			expect(result.phone).toBe('+6281234567890');
		});

		// ============================================
		// P1: Edge Cases
		// ============================================

		it('[P1] should create customer with minimal data', async () => {
			const newCustomer = createTestCustomer({
				phone: '+6281234567890',
				name: 'New Name',
				email: null,
				address: null,
			});
			vi.mocked(mockCustomerRepo.findByPhone).mockResolvedValue(null);
			vi.mocked(mockCustomerRepo.create).mockResolvedValue(newCustomer);

			await customersService.findOrCreateByPhone('+6281234567890', 'New Name');

			expect(mockCustomerRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					isBlacklisted: false,
				})
			);
		});
	});
});
