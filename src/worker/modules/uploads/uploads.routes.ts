import { Hono } from 'hono';
import { authMiddleware, requireRole } from '@/worker/core/middleware/auth';

type UploadEnv = { Bindings: Env };

// TC-BK-006: detect the image type from file CONTENT (magic bytes) instead of
// trusting the client-declared MIME. Browsers send file.type = '' (or a wrong
// generic type) for some valid PNGs, so the old declared-type check rejected
// real images. The sniffed type is the single source of truth.
function sniffImageType(buffer: ArrayBuffer): string | null {
  const b = new Uint8Array(buffer.byteLength < 12 ? buffer : buffer.slice(0, 12));
  if (b.length < 4) return null;
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  // GIF: "GIF8"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  // WebP: "RIFF"...."WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp';
  return null;
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'bin';
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

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return c.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File must be under 5MB' } }, 400);
		}

		// TC-BK-006: validate by CONTENT (magic bytes), not the declared MIME —
		// valid PNGs with an empty/mislabelled file.type were being rejected.
		const buffer = await file.arrayBuffer();
		const detectedType = sniffImageType(buffer);
		if (!detectedType) {
			return c.json({ success: false, error: { code: 'INVALID_FILE', message: 'Only JPEG, PNG, WebP, and GIF images are allowed' } }, 400);
		}

		// Generate key + stored contentType from the sniffed (authoritative) type
		const ext = getExtensionFromMimeType(detectedType);
		const key = `${new Date().toISOString().split('T')[0]}-${crypto.randomUUID()}.${ext}`;

		await bucket.put(key, buffer, {
			httpMetadata: { contentType: detectedType },
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
