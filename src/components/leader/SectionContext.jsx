import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const SectionContext = createContext();

export const useSectionContext = () => {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error('useSectionContext must be used within SectionProvider');
  }
  return context;
};

export const SectionProvider = ({ children }) => {
  const [selectedSection, setSelectedSection] = useState(null);
  const [availableSections, setAvailableSections] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndSections();
  }, []);

  const loadUserAndSections = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.role === 'admin') {
        // Admin can see all sections
        const allSections = await base44.entities.Section.filter({ active: true });
        setAvailableSections(allSections);
        // Set first section as default if none selected
        if (!selectedSection && allSections.length > 0) {
          setSelectedSection(allSections[0].id);
        }
      } else {
        // Non-admin leader - get their assigned sections
        const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
        if (leaders.length > 0 && leaders[0].section_ids?.length > 0) {
          const sections = await base44.entities.Section.filter({ active: true });
          const leaderSections = sections.filter(s => leaders[0].section_ids.includes(s.id));
          setAvailableSections(leaderSections);
          // Set first section as default if none selected
          if (!selectedSection && leaderSections.length > 0) {
            setSelectedSection(leaderSections[0].id);
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
        setSelectedSection,
        availableSections,
        user,
        loading,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </SectionContext.Provider>
  );
};