import type { Config } from 'drizzle-kit';

export default {
	schema: './src/worker/core/database/schema/index.ts',
	out: './migrations',
	driver: 'd1-http',
	dialect: 'sqlite',
} satisfies Config;
