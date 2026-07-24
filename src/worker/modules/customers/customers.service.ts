import { CustomersRepository } from './customers.repository';
import { ConflictError, NotFoundError } from '@/worker/core/types/errors';
import type {
	CustomerResponse,
	CustomerWithHistory,
	CustomerBasic
} from './customers.types';
import type {
	CreateCustomerRequest,
	UpdateCustomerRequest,
	SetBlacklistRequest,
	ListCustomersQuery
} from './customers.dto';
import type { Customer } from '@/worker/core/database/schema';

export class CustomersService {
	constructor(private customerRepo: CustomersRepository) {}

	// Transform customer to response format
	private toResponse(customer: Customer): CustomerResponse {
		return {
			id: customer.id,
			name: customer.name,
			phone: customer.phone,
			email: customer.email,
			address: customer.address,
			identityType: customer.identityType,
			identityNumber: customer.identityNumber,
			identityPhotoUrl: customer.identityPhotoUrl,
			notes: customer.notes,
			isBlacklisted: customer.isBlacklisted,
			blacklistReason: customer.blacklistReason,
			createdAt: customer.createdAt,
		};
	}

	async list(query: ListCustomersQuery): Promise<{
		items: CustomerResponse[];
		meta: { page: number; limit: number; total: number; totalPages: number };
	}> {
		const { items, total } = await this.customerRepo.list(query);
		const totalPages = Math.ceil(total / query.limit);

		return {
			items: items.map(this.toResponse),
			meta: {
				page: query.page,
				limit: query.limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<CustomerWithHistory | null> {
		const customer = await this.customerRepo.findById(id);
		if (!customer) {
			return null;
		}

		// TODO: Fetch rental history when booking module is implemented
		const rentalHistory: CustomerWithHistory['rentalHistory'] = [];

		return {
			...this.toResponse(customer),
			rentalHistory,
		};
	}

	async create(data: CreateCustomerRequest): Promise<CustomerResponse> {
		// CUST-06: reject duplicate phone numbers
		const existingByPhone = await this.customerRepo.findByPhone(data.phone);
		if (existingByPhone) {
			throw new ConflictError('Nomor telepon sudah terdaftar');
		}

		// Check if email already exists (if provided)
		if (data.email) {
			const existingByEmail = await this.customerRepo.findByEmail(data.email);
			if (existingByEmail) {
				throw new ConflictError('Email already exists');
			}
		}

		const customer = await this.customerRepo.create({
			name: data.name,
			phone: data.phone,
			email: data.email ?? null,
			address: data.address ?? null,
			identityType: data.identityType ?? null,
			identityNumber: data.identityNumber ?? null,
			identityPhotoUrl: data.identityPhotoUrl ?? null,
			notes: data.notes ?? null,
			isBlacklisted: false,
			blacklistReason: null,
		});

		return this.toResponse(customer);
	}

	async update(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
		const existing = await this.customerRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Customer');
		}

		// CUST-06: check phone uniqueness if changing phone
		if (data.phone && data.phone !== existing.phone) {
			const existingByPhone = await this.customerRepo.findByPhone(data.phone);
			if (existingByPhone) {
				throw new ConflictError('Nomor telepon sudah terdaftar');
			}
		}

		// Check email uniqueness if changing email
		if (data.email && data.email !== existing.email) {
			const existingByEmail = await this.customerRepo.findByEmail(data.email);
			if (existingByEmail) {
				throw new ConflictError('Email already exists');
			}
		}

		// Check phone uniqueness if changing phone
		if (data.phone && data.phone !== existing.phone) {
			const existingByPhone = await this.customerRepo.findByPhone(data.phone);
			if (existingByPhone) {
				throw new ConflictError('Nomor telepon sudah terdaftar');
			}
		}

		const customer = await this.customerRepo.update(id, {
			name: data.name,
			phone: data.phone,
			email: data.email,
			address: data.address,
			identityType: data.identityType,
			identityNumber: data.identityNumber,
			identityPhotoUrl: data.identityPhotoUrl,
			notes: data.notes,
		});

		if (!customer) {
			throw new NotFoundError('Customer');
		}

		return this.toResponse(customer);
	}

	async setBlacklist(id: string, data: SetBlacklistRequest): Promise<CustomerResponse> {
		const existing = await this.customerRepo.findById(id);
		if (!existing) {
			throw new NotFoundError('Customer');
		}

		const customer = await this.customerRepo.setBlacklist(
			id,
			data.isBlacklisted,
			data.reason ?? null
		);

		if (!customer) {
			throw new NotFoundError('Customer');
		}

		return this.toResponse(customer);
	}

	async findByPhone(phone: string): Promise<CustomerBasic | null> {
		const customer = await this.customerRepo.findByPhone(phone);
		if (!customer) {
			return null;
		}

		return {
			id: customer.id,
			name: customer.name,
			phone: customer.phone,
			isBlacklisted: customer.isBlacklisted,
		};
	}

	async checkExists(id: string): Promise<boolean> {
		return this.customerRepo.checkExists(id);
	}

	// Helper method for auto-creating customer from booking
	async findOrCreateByPhone(phone: string, name: string): Promise<Customer> {
		let customer = await this.customerRepo.findByPhone(phone);

		if (!customer) {
			customer = await this.customerRepo.create({
				name,
				phone,
				isBlacklisted: false,
			});
		}

		return customer;
	}
}
