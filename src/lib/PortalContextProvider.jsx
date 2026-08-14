import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const PortalContext = createContext();

export const CONTEXT_STORAGE_KEY = 'syke_active_context';
export const CONTEXT_EVENT_NAME = 'syke-context-changed';

export const SECTION_COLORS = {
  squirrels: '#e22e12',
  beavers: '#23a950',
  cubs: '#ffb800',
  scouts: '#006ddf',
  explorers: '#7413dc',
};

export function usePortalContext() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortalContext must be used within a PortalContextProvider');
  return ctx;
}

function readStored() {
  try {
    const raw = localStorage.getItem(CONTEXT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function homePathFor(context) {
  if (!context) return '/';
  if (context.type === 'child') return createPageUrl('ParentDashboard');
  if (context.type === 'section') return createPageUrl('LeaderDashboard');
  if (context.type === 'role:treasurer') return createPageUrl('TreasurerDashboard');
  if (context.type === 'role:admin') return createPageUrl('AdminSettings');
  return '/';
}

// Maps an activeContext.type to the "portal" family it permits, used by route guards.
export function getPermittedPortal(activeContext) {
  if (!activeContext) return null;
  if (activeContext.type === 'child') return 'parent';
  if (activeContext.type === 'section') return 'leader';
  if (activeContext.type === 'role:treasurer') return 'treasurer';
  if (activeContext.type === 'role:admin') return 'admin';
  return null;
}

export function PortalContextProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeContext, setActiveContextState] = useState(readStored());
  const [availableContexts, setAvailableContexts] = useState({ children: [], sections: [], roles: [] });
  const [isResolved, setIsResolved] = useState(false);
  const [isLoadingContexts, setIsLoadingContexts] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    loadContexts();
  }, []);

  const loadContexts = async () => {
    try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        setIsLoadingContexts(false);
        setIsResolved(true);
        return;
      }
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [members, leaders, sectionsAll] = await Promise.all([
        base44.entities.Member.filter({}).catch(() => []),
        base44.entities.Leader.filter({ user_id: currentUser.id }).catch(() => []),
        base44.entities.Section.filter({ active: true }).catch(() => []),
      ]);

      const childItems = members
        .filter(m => m.parent_one_email === currentUser.email || m.parent_two_email === currentUser.email)
        .map(m => ({ type: 'child', id: m.id, label: m.preferred_name || m.first_name, member: m }));

      let sectionIds = [];
      if (currentUser.role === 'admin' || currentUser.role === 'glv') {
        sectionIds = sectionsAll.map(s => s.id);
      } else if (leaders.length > 0) {
        sectionIds = leaders[0].section_ids || [];
      }
      const sectionItems = sectionsAll
        .filter(s => sectionIds.includes(s.id))
        .map(s => ({ type: 'section', id: s.id, label: s.display_name, section: s }));

      const roleItems = [];
      if (currentUser.role === 'treasurer') roleItems.push({ type: 'role:treasurer', id: 'treasurer', label: 'Treasurer' });
      if (currentUser.role === 'admin') roleItems.push({ type: 'role:admin', id: 'admin', label: 'Admin' });

      const contexts = { children: childItems, sections: sectionItems, roles: roleItems };
      setAvailableContexts(contexts);

      const allItems = [...childItems, ...sectionItems, ...roleItems];
      const stored = readStored();
      const storedValid = stored && allItems.some(i => i.type === stored.type && i.id === stored.id);

      if (storedValid) {
        setActiveContextState(stored);
      } else if (allItems.length === 1) {
        commitContext(allItems[0], { navigate: false, silent: true });
      } else {
        try { localStorage.removeItem(CONTEXT_STORAGE_KEY); } catch { /* ignore */ }
        setActiveContextState(null);
      }
    } catch (error) {
      console.error('Failed to load portal contexts', error);
    } finally {
      setIsLoadingContexts(false);
      setIsResolved(true);
    }
  };

  // Commits a context to state + localStorage + event, optionally navigating.
  const commitContext = useCallback((context, { navigate: shouldNavigate = true, silent = false } = {}) => {
    const stored = { type: context.type, id: context.id, label: context.label };
    try { localStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(stored)); } catch { /* ignore */ }
    if (context.type === 'section') {
      try { localStorage.setItem('syke_active_section', context.id); } catch { /* ignore */ }
    }
    setActiveContextState(stored);
    if (!silent) setPickerOpen(false);
    window.dispatchEvent(new CustomEvent(CONTEXT_EVENT_NAME, { detail: stored }));
    if (shouldNavigate) {
      navigate(homePathFor(stored));
    }
    return stored;
  }, [navigate]);

  // Public: user explicitly picked a context (modal / dropdown) — navigates to its home page.
  const setActiveContext = useCallback((context) => commitContext(context, { navigate: true }), [commitContext]);

  // Public: internal sync (e.g. switching child/section while already on the right page) — no navigation.
  const syncActiveContext = useCallback((context) => commitContext(context, { navigate: false }), [commitContext]);

  return (
    <PortalContext.Provider value={{
      user,
      activeContext,
      setActiveContext,
      syncActiveContext,
      availableContexts,
      isResolved,
      isLoadingContexts,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => setPickerOpen(false),
      refreshContexts: loadContexts,
    }}>
      {children}
    </PortalContext.Provider>
  );
}