import 'reflect-metadata';
import { container } from 'tsyringe';
import { TYPES } from './types';

// Import database wrapper
import { createDb } from '@/worker/core/database';

// Import repositories
import { UserRepository } from '@/worker/modules/auth/auth.repository';

// Import services
import { AuthService } from '@/worker/modules/auth/auth.service';
import { JwtService } from '@/worker/core/services/jwt.service';

// Import controllers and routes
import { AuthController } from '@/worker/modules/auth/auth.controller';
import { AuthRoutes } from '@/worker/modules/auth/auth.routes';

export function configureContainer(env: Env) {
	// Clear previous registrations for fresh container
	container.reset();

	// Create Drizzle wrapper for D1
	const db = createDb(env.DB);

	// Create JWT service
	const jwtService = new JwtService(env.JWT_SECRET);

	// Create repository instance
	const userRepository = new UserRepository(db);

	// Create service instance
	const authService = new AuthService(userRepository, jwtService);

	// Create controller instance
	const authController = new AuthController(authService);

	// Create routes instance
	const authRoutes = new AuthRoutes(authController);

	// Register instances for potential reuse
	container.registerInstance(TYPES.Database, db);
	container.registerInstance(TYPES.JwtService, jwtService);
	container.registerInstance(TYPES.UserRepository, userRepository);
	container.registerInstance(TYPES.AuthService, authService);
	container.registerInstance(TYPES.AuthController, authController);
	container.registerInstance(TYPES.AuthRoutes, authRoutes);

	return container;
}

export { container, TYPES };
