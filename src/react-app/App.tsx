import { useEffect } from 'react';
import { AppRouter } from '@/react-app/router';
import { useAuthStore } from '@/react-app/features/auth/stores/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

function App() {
	const fetchUser = useAuthStore((state) => state.fetchUser);

	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	return (
		<QueryClientProvider client={queryClient}>
			<AppRouter />
		</QueryClientProvider>
	);
}

export default App;
