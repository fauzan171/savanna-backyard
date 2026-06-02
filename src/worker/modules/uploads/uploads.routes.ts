import { Hono } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';

type UploadEnv = { Bindings: Env };

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

	// Upload file
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

		// Validate file type
		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
		if (!allowedTypes.includes(file.type)) {
			return c.json({ success: false, error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' } }, 400);
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return c.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File must be under 5MB' } }, 400);
		}

		// Generate unique key: date-uuid.ext
		const ext = file.name.split('.').pop() || 'jpg';
		const key = `${new Date().toISOString().split('T')[0]}-${crypto.randomUUID()}.${ext}`;

		await bucket.put(key, file.stream(), {
			httpMetadata: { contentType: file.type },
		});

		// Return the public URL path
		const url = `/api/v1/uploads/${key}`;

		return c.json({ success: true, data: { key, url } }, 201);
	});

	// Delete file
	router.delete('/:key{.+}', async (c) => {
		const bucket = c.env.UPLOADS;
		if (!bucket) {
			return c.json({ success: false, error: { code: 'NO_BUCKET', message: 'R2 bucket not configured' } }, 500);
		}

		const key = c.req.param('key');
		await bucket.delete(key);

		return c.json({ success: true, data: { deleted: true } });
	});

	return router;
}
