import { useState, useEffect } from 'react';
import { usePortalContext } from '@/lib/PortalContextProvider';

// Persistent selected-child for the web parent portal.
// Stored in localStorage so it survives navigation and future visits;
// a window event keeps all mounted components in sync.
const KEY = 'sykescouts_selected_child';
const EVENT = 'selected-child-changed';

export function getStoredChildId() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function storeChildId(id) {
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

// Returns [selectedChildId, setSelectedChildId]. Pass the children list to
// auto-validate: if the stored id isn't one of them, falls back to the first.
// When the unified portal context is active with type 'child', it takes
// precedence for the initial value and is kept in sync on every change
// (no navigation — we're already on the parent portal).
export function useSelectedChildId(children) {
  const portal = usePortalContext();
  const contextChildId = portal.activeContext?.type === 'child' ? portal.activeContext.id : null;
  const [id, setId] = useState(contextChildId || getStoredChildId());

  useEffect(() => {
    const handler = (e) => setId(e.detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  // Keep in sync when the child is switched via the unified portal context
  // (e.g. the nav bar dropdown) while already on the parent portal — no
  // navigation happens in that case, so this effect is what updates the data.
  useEffect(() => {
    if (contextChildId && contextChildId !== id) {
      setId(contextChildId);
    }
  }, [contextChildId]);

  const validId = children?.length
    ? (children.some(c => c.id === id) ? id : children[0].id)
    : id;

  const setSelectedChildId = (newId) => {
    storeChildId(newId);
    const child = children?.find(c => c.id === newId);
    if (child) {
      portal.syncActiveContext({ type: 'child', id: child.id, label: child.preferred_name || child.first_name });
    }
  };

  return [validId, setSelectedChildId];
}

// Avatar colours for children (cycled by index)
export const CHILD_COLORS = ['#7413dc', '#006ddf', '#23a950', '#e22e12', '#ffb800'];
export const childColor = (index) => CHILD_COLORS[index % CHILD_COLORS.length];
export const childInitials = (child) =>
  `${(child.first_name || child.full_name || '?')[0] || ''}${(child.surname || '')[0] || ''}`.toUpperCase();