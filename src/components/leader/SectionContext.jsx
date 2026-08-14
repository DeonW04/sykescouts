import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePortalContext } from '@/lib/PortalContextProvider';

const SectionContext = createContext();

export const useSectionContext = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error('useSectionContext must be used within SectionProvider');
  }
  return context;
};

export const SectionProvider = ({ children }) => {
  const portal = usePortalContext();
  const [selectedSection, setSelectedSection] = useState(null);
  const [previousSection, setPreviousSection] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [availableSections, setAvailableSections] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pendingSectionId, setPendingSectionId] = useState(null);

  // Persist active section across navigation
  useEffect(() => {
    if (selectedSection) {
      localStorage.setItem('syke_active_section', selectedSection);
    }
  }, [selectedSection]);

  const changeSection = (newSectionId) => {
    if (newSectionId === selectedSection) return;
    // Commit the new section immediately so the whole app is always in sync —
    // the overlay is purely visual and must never gate the actual state change.
    localStorage.setItem('syke_active_section', newSectionId);
    setPreviousSection(selectedSection);
    setPendingSectionId(newSectionId);
    setSelectedSection(newSectionId);
    setTransitioning(true);
    // Keep the unified portal context in sync (no navigation — we're already on the leader portal).
    const section = availableSections.find(s => s.id === newSectionId);
    if (section) {
      portal.syncActiveContext({ type: 'section', id: section.id, label: section.display_name });
    }
  };

  const onTransitionComplete = () => {
    setPreviousSection(null);
    setPendingSectionId(null);
    setTransitioning(false);
  };

  useEffect(() => {
    loadUserAndSections();
  }, []);

  const loadUserAndSections = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const defaultId = currentUser.default_section_id;

      // The unified portal context (when type is 'section') is the primary source of truth;
      // fall back to the legacy localStorage key for backward compatibility.
      const contextSectionId = portal.activeContext?.type === 'section' ? portal.activeContext.id : null;

      if (currentUser.role === 'admin') {
        const allSections = await base44.entities.Section.filter({ active: true });
        setAvailableSections(allSections);
        if (allSections.length > 0) {
          const storedId = contextSectionId || localStorage.getItem('syke_active_section');
          const preferred = storedId || defaultId;
          const preferredExists = preferred && allSections.find(s => s.id === preferred);
          setSelectedSection(preferredExists ? preferred : allSections[0].id);
        }
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
        if (leaders.length > 0 && leaders[0].section_ids?.length > 0) {
          const sections = await base44.entities.Section.filter({ active: true });
          const leaderSections = sections.filter(s => leaders[0].section_ids.includes(s.id));
          setAvailableSections(leaderSections);
          if (leaderSections.length > 0) {
            const storedId = contextSectionId || localStorage.getItem('syke_active_section');
            const preferred = storedId || defaultId;
            const preferredExists = preferred && leaderSections.find(s => s.id === preferred);
            setSelectedSection(preferredExists ? preferred : leaderSections[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user sections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionContext.Provider
      value={{
        selectedSection,
        setSelectedSection: changeSection,
        availableSections,
        user,
        loading,
        isAdmin: user?.role === 'admin',
        transitioning,
        previousSection,
        pendingSectionId,
        onTransitionComplete,
      }}
    >
      {children}
    </SectionContext.Provider>
  );
};