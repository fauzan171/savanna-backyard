import { Hono, Context } from 'hono';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { UserRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtService } from '@/worker/core/services/jwt.service';
import { setCookie } from 'hono/cookie';
import { validateBody, getValidatedBody } from '@/worker/core/middleware/validator';
import { loginSchema, type LoginRequest } from './auth.dto';

// Type for storing services in context
type AuthVariables = {
	authService: AuthService;
	jwtService: JwtService;
	user: { userId: string };
};

type AuthEnv = { Bindings: Env; Variables: AuthVariables };

// Middleware to inject auth services into context
export const authServicesMiddleware = () => async (c: Context<AuthEnv>, next: () => Promise<void>) => {
	const db = createDb(c.env.DB);
	const jwtService = new JwtService(c.env.JWT_SECRET);
	const userRepository = new UserRepository(db);
	const authService = new AuthService(userRepository, jwtService);

	c.set('jwtService', jwtService);
	c.set('authService', authService);
	await next();
};

// Route handlers that use services from context
const loginHandler = async (c: Context<AuthEnv>) => {
	const authService = c.get('authService');
	const body = getValidatedBody<LoginRequest>(c);
	const result = await authService.login(body);

	setCookie(c, 'token', result.token, {
		httpOnly: true,
		secure: c.env.ENVIRONMENT === 'production',
		sameSite: 'Strict',
		maxAge: 60 * 60 * 24 * 7,
		path: '/',
	});

	return c.json({ data: result.user });
};

const meHandler = async (c: Context<AuthEnv>) => {
	const authService = c.get('authService');
	const user = c.get('user');
	const result = await authService.me(user.userId);
	return c.json({ data: result });
};

const logoutHandler = async (c: Context<AuthEnv>) => {
	setCookie(c, 'token', '', {
		httpOnly: true,
		secure: c.env.ENVIRONMENT === 'production',
		sameSite: 'Strict',
		maxAge: 0,
		path: '/',
	});
	return c.json({ message: 'Logged out successfully' });
};

// Factory function to create auth router
export function createAuthRouter(): Hono<AuthEnv> {
	const router = new Hono<AuthEnv>();

	// Apply services middleware to all auth routes
	router.use('*', authServicesMiddleware());

	// Public routes
	router.post('/login', validateBody(loginSchema), loginHandler);

	// Protected routes
	router.get('/me', authMiddleware(), meHandler);
	router.post('/logout', logoutHandler);

	return router;
}
