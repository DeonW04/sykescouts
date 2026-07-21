import { useState, useEffect } from 'react';

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
export function useSelectedChildId(children) {
  const [id, setId] = useState(getStoredChildId());

  useEffect(() => {
    const handler = (e) => setId(e.detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const validId = children?.length
    ? (children.some(c => c.id === id) ? id : children[0].id)
    : id;

  return [validId, storeChildId];
}

// Avatar colours for children (cycled by index)
export const CHILD_COLORS = ['#7413dc', '#006ddf', '#23a950', '#e22e12', '#ffb800'];
export const childColor = (index) => CHILD_COLORS[index % CHILD_COLORS.length];
export const childInitials = (child) =>
  `${(child.first_name || child.full_name || '?')[0] || ''}${(child.surname || '')[0] || ''}`.toUpperCase();