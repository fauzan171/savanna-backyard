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
			// Clear auth state — React Router guards will handle redirect to /login
			useAuthStore.getState().logout();
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

	async upload(path: string, file: File): Promise<{ success: boolean; data: { key: string; url: string } }> {
		const formData = new FormData();
		formData.append('file', file);

		const url = `${this.baseUrl}${path}`;
		const response = await fetch(url, {
			method: 'POST',
			body: formData,
			credentials: 'include',
		});

		if (response.status === 401) {
			useAuthStore.getState().logout();
			throw new Error('Unauthorized');
		}

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
			throw new Error(error.error?.message || 'Upload failed');
		}

		return response.json();
	}
}

export const api = new ApiClient();
