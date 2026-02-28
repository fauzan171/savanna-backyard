import { z } from 'zod';

// Create lead schema
export const createLeadSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters').max(100),
	phone: z.string().min(5, 'Phone must be at least 5 characters'),
	email: z.string().email('Invalid email address').optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
	source: z.enum(['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn']).default('Website'),
	priority: z.enum(['Hot', 'Warm', 'Cold']).default('Warm'),
	assignedTo: z.string().optional().nullable(),
	followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// Update lead schema
export const updateLeadSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	phone: z.string().min(5).optional(),
	email: z.string().email().optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
	priority: z.enum(['Hot', 'Warm', 'Cold']).optional(),
	assignedTo: z.string().optional().nullable(),
	followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// Update status schema
export const updateLeadStatusSchema = z.object({
	status: z.enum(['New', 'Contacted', 'Negotiating', 'Converted', 'Lost']),
	notes: z.string().max(500).optional().nullable(),
});

// Add note schema (append to existing notes)
export const addNoteSchema = z.object({
	note: z.string().min(1, 'Note cannot be empty').max(1000),
});

// List query schema
export const listLeadsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	status: z.enum(['New', 'Contacted', 'Negotiating', 'Converted', 'Lost']).optional(),
	source: z.enum(['WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'Website', 'WalkIn']).optional(),
	priority: z.enum(['Hot', 'Warm', 'Cold']).optional(),
	assignedTo: z.string().optional(),
	search: z.string().optional(),
	followUpDue: z.coerce.boolean().optional(),
});

// Types
export type CreateLeadRequest = z.infer<typeof createLeadSchema>;
export type UpdateLeadRequest = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusRequest = z.infer<typeof updateLeadStatusSchema>;
export type AddNoteRequest = z.infer<typeof addNoteSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
