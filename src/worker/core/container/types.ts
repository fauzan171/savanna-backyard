// DI Container Service Identifiers
export const TYPES = {
	// Repositories
	UserRepository: Symbol.for('UserRepository'),

	// Services
	AuthService: Symbol.for('AuthService'),
	JwtService: Symbol.for('JwtService'),

	// Controllers
	AuthController: Symbol.for('AuthController'),

	// Routes
	AuthRoutes: Symbol.for('AuthRoutes'),

	// External
	Database: Symbol.for('Database'),
} as const;
