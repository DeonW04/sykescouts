import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Admin "Act as Parent" — transparently attach the impersonated child's id to
// the two parent-portal data functions so every parent page (which all call
// these same two functions) automatically shows that parent's exact view,
// with no per-page changes needed. See src/lib/PortalContextProvider.jsx.
const ACTING_CHILD_KEY = 'syke_acting_child';
const IMPERSONATED_FUNCTIONS = new Set(['getParentPortalData', 'getParentReferenceData']);
const rawInvoke = base44.functions.invoke.bind(base44.functions);
base44.functions.invoke = (name, payload = {}) => {
  if (IMPERSONATED_FUNCTIONS.has(name)) {
    try {
      const stored = localStorage.getItem(ACTING_CHILD_KEY);
      const acting = stored ? JSON.parse(stored) : null;
      if (acting?.id) payload = { ...payload, actingChildId: acting.id };
    } catch { /* ignore */ }
  }
  return rawInvoke(name, payload);
};