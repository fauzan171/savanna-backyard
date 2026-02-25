import { Context } from 'hono';
import { AuthService } from './auth.service';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { loginSchema, type LoginRequest } from './auth.dto';
import { setCookie } from 'hono/cookie';

export class AuthController {
	constructor(private authService: AuthService) {}

	login = async (c: Context) => {
		const body = getValidatedBody<LoginRequest>(c);
		const result = await this.authService.login(body);

		// Set httpOnly cookie
		setCookie(c, 'token', result.token, {
			httpOnly: true,
			secure: c.env.ENVIRONMENT === 'production',
			sameSite: 'Strict',
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: '/',
		});

		return c.json({ data: result.user });
	};

	me = async (c: Context) => {
		const user = c.get('user');
		const result = await this.authService.me(user.userId);
		return c.json({ data: result });
	};

	logout = async (c: Context) => {
		setCookie(c, 'token', '', {
			httpOnly: true,
			secure: c.env.ENVIRONMENT === 'production',
			sameSite: 'Strict',
			maxAge: 0,
			path: '/',
		});
		return c.json({ message: 'Logged out successfully' });
	};
}

// Export validation middleware factory for routes
export { validateBody, loginSchema };
