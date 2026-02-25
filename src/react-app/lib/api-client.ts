import { useAuthStore } from '@/react-app/features/auth/stores/authStore';

interface ApiOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	params?: Record<string, string>;
}

class ApiClient {
	private baseUrl = '/api';

	async request<T>(path: string, options: ApiOptions = {}): Promise<T> {
		const { method = 'GET', body, params } = options;

		let url = `${this.baseUrl}${path}`;
		if (params) {
			const searchParams = new URLSearchParams(params);
			url += `?${searchParams.toString()}`;
		}

		const response = await fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
			},
			body: body ? JSON.stringify(body) : undefined,
			credentials: 'include', // For httpOnly cookies
		});

		if (response.status === 401) {
			// Auto logout on 401
			useAuthStore.getState().logout();
			window.location.href = '/login';
			throw new Error('Unauthorized');
		}

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
			throw new Error(error.error?.message || 'Request failed');
		}

		return response.json();
	}

	get<T>(path: string, params?: Record<string, string>) {
		return this.request<T>(path, { params });
	}

	post<T>(path: string, body?: unknown) {
		return this.request<T>(path, { method: 'POST', body });
	}

	put<T>(path: string, body?: unknown) {
		return this.request<T>(path, { method: 'PUT', body });
	}

	patch<T>(path: string, body?: unknown) {
		return this.request<T>(path, { method: 'PATCH', body });
	}

	delete<T>(path: string) {
		return this.request<T>(path, { method: 'DELETE' });
	}
}

export const api = new ApiClient();
