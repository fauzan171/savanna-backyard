import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
	const { login } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormData>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: 'admin@savanna.local',
			password: 'admin123',
		},
	});

	const onSubmit = async (data: LoginFormData) => {
		setError(null);
		setIsLoading(true);
		try {
			await login(data.email, data.password);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savanna Backyard</h1>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Vehicle Rental Admin Panel
				</p>
			</div>

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				{error && (
					<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/50 dark:text-red-200">
						{error}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="admin@savanna.local"
						{...register('email')}
						disabled={isLoading}
					/>
					{errors.email && (
						<p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						{...register('password')}
						disabled={isLoading}
					/>
					{errors.password && (
						<p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
					)}
				</div>

				<Button type="submit" className="w-full" disabled={isLoading}>
					{isLoading ? 'Signing in...' : 'Sign in'}
				</Button>
			</form>
		</div>
	);
}
