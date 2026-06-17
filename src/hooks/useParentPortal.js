import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Single source of truth for the parent portal dataset.
// One backend call returns everything every parent page needs (children,
// sections, payments, badges, awards, action responses, etc).
//
// Caching strategy (stale-while-revalidate):
//  - staleTime 5min: page switches within 5 min serve the cached data INSTANTLY
//    with no network request and no spinner.
//  - After 5 min, switching pages still shows cached data immediately, then
//    silently refreshes in the background (refetchOnMount) — the user never
//    sees a loading state.
//  - gcTime 30min: cache persists in memory while the portal is in use.
export const PARENT_PORTAL_KEY = ['parent-portal'];

const fetchParentPortal = async () =>
  (await base44.functions.invoke('getParentPortalData', {})).data;

export function useParentPortal(options = {}) {
  return useQuery({
    queryKey: PARENT_PORTAL_KEY,
    queryFn: fetchParentPortal,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    ...options,
  });
}

// Helper to force a fresh pull (e.g. after a payment or response is saved).
export function useInvalidateParentPortal() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PARENT_PORTAL_KEY });
}

// Warm the cache up-front (called on login / app entry) so the first page
// render already has data instead of fetching on demand.
export function prefetchParentPortal(queryClient) {
  return queryClient.prefetchQuery({
    queryKey: PARENT_PORTAL_KEY,
    queryFn: fetchParentPortal,
    staleTime: 5 * 60 * 1000,
  });
}