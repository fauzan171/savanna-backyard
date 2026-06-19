import { Hono } from 'hono';
import { authMiddleware, requireRole } from '@/worker/core/middleware/auth';

type UploadEnv = { Bindings: Env };

// Magic bytes for image type validation
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header (first 4 bytes of WebP)
};

function validateMagicBytes(buffer: ArrayBuffer, declaredType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  const expected = MAGIC_BYTES[declaredType];
  if (!expected) return false;
  return expected.every((byte, i) => bytes[i] === byte);
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'jpg';
}

export function createUploadRouter(): Hono<UploadEnv> {
	const router = new Hono<UploadEnv>();

	// Serve uploaded file (public read - NO auth)
	router.get('/:key{.+}', async (c) => {
		const bucket = c.env.UPLOADS;
		if (!bucket) {
			return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
		}

		const key = c.req.param('key');
		const object = await bucket.get(key);

		if (!object) {
			return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } }, 404);
		}

		const headers = new Headers();
		headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
		headers.set('Cache-Control', 'public, max-age=31536000, immutable');

		return new Response(object.body, { headers });
	});

	// All write operations require auth
	router.use('*', authMiddleware());

	// Upload file (SUPER_ADMIN or STAFF)
	router.post('/', async (c) => {
		const bucket = c.env.UPLOADS;
		if (!bucket) {
			return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
		}

		const contentType = c.req.header('Content-Type') || '';
		if (!contentType.startsWith('multipart/form-data')) {
			return c.json({ success: false, error: { code: 'INVALID_CONTENT_TYPE', message: 'Expected multipart/form-data' } }, 400);
		}

		const formData = await c.req.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return c.json({ success: false, error: { code: 'NO_FILE', message: 'No file provided' } }, 400);
		}

		// Validate file type by MIME type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		if (!allowedTypes.includes(file.type)) {
			return c.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' } }, 400);
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return c.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File must be under 5MB' } }, 400);
		}

		// Validate magic bytes (actual file content matches declared type)
		const buffer = await file.arrayBuffer();
		if (!validateMagicBytes(buffer, file.type)) {
			return c.json({ success: false, error: { code: 'INVALID_FILE', message: 'File content does not match declared type' } }, 400);
		}

		// Generate key with correct extension from validated MIME type
		const ext = getExtensionFromMimeType(file.type);
		const key = `${new Date().toISOString().split('T')[0]}-${crypto.randomUUID()}.${ext}`;

		await bucket.put(key, buffer, {
			httpMetadata: { contentType: file.type },
		});

		// Return the public URL path
		const url = `/api/v1/uploads/${key}`;

		return c.json({ success: true, data: { key, url } }, 201);
	});

	// Delete file (SUPER_ADMIN only)
	router.delete('/:key{.+}', requireRole('SUPER_ADMIN'), async (c) => {
		const bucket = c.env.UPLOADS;
		if (!bucket) {
			return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
		}

		const key = c.req.param('key');

		// Check if file exists before deleting
		const object = await bucket.get(key);
		if (!object) {
			return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } }, 404);
		}

		await bucket.delete(key);

		return c.json({ success: true, data: { deleted: true } });
	});

	return router;
}
