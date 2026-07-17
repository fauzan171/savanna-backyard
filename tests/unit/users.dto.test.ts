import { describe, it, expect } from 'vitest';
import { createUserSchema } from '@/worker/modules/users/users.dto';

const valid = { name: 'Budi', email: 'budi@mail.com', password: 'Pass1234' };

describe('createUserSchema password strength (USER-03)', () => {
	it('rejects empty password', () => {
		expect(createUserSchema.safeParse({ ...valid, password: '' }).success).toBe(false);
	});
	it('rejects weak password (digits only)', () => {
		expect(createUserSchema.safeParse({ ...valid, password: '12345678' }).success).toBe(false);
	});
	it('rejects short password', () => {
		expect(createUserSchema.safeParse({ ...valid, password: 'Ab1' }).success).toBe(false);
	});
	it('accepts strong password', () => {
		expect(createUserSchema.safeParse({ ...valid, password: 'Pass1234' }).success).toBe(true);
	});
	it('rejects invalid email', () => {
		expect(createUserSchema.safeParse({ ...valid, email: 'bukanemail' }).success).toBe(false);
	});
});
