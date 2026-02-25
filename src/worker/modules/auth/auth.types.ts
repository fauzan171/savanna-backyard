// Re-export user types from schema
export type { User, NewUser } from '@/worker/core/database/schema';

// Auth-specific types
export interface AuthUser {
	id: string;
	name: string;
	email: string;
	role: 'SUPER_ADMIN' | 'STAFF';
}
