import { Hono } from 'hono';
import { AuthController, validateBody, loginSchema } from './auth.controller';
import { authMiddleware } from '@/worker/core/middleware/auth';
import { createDb } from '@/worker/core/database';
import { UserRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtService } from '@/worker/core/services/jwt.service';

export class AuthRoutes {
	private router = new Hono<{ Bindings: Env }>();

	constructor(controller: AuthController) {
		this.setupRoutes(controller);
	}

	private setupRoutes(controller: AuthController) {
		// Public routes
		this.router.post('/login', validateBody(loginSchema), controller.login);

		// Protected routes
		this.router.get('/me', authMiddleware(), controller.me);
		this.router.post('/logout', controller.logout);
	}

	getRouter() {
		return this.router;
	}
}

// Factory function to create auth routes with env
export function createAuthRoutes(env: Env): AuthRoutes {
	const db = createDb(env.DB);
	const jwtService = new JwtService(env.JWT_SECRET);
	const userRepository = new UserRepository(db);
	const authService = new AuthService(userRepository, jwtService);
	const authController = new AuthController(authService);

	return new AuthRoutes(authController);
}
