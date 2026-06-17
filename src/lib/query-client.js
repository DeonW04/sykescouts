import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Stale-while-revalidate: serve cached data instantly on page
			// switches, then silently refresh in the background. Makes parent
			// page transitions feel instant after the first load.
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
		},
	},
});