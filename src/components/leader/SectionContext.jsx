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
      const defaultId = currentUser.default_section_id;

      if (currentUser.role === 'admin') {
        const allSections = await base44.entities.Section.filter({ active: true });
        setAvailableSections(allSections);
        if (allSections.length > 0) {
          const defaultExists = defaultId && allSections.find(s => s.id === defaultId);
          setSelectedSection(defaultExists ? defaultId : allSections[0].id);
        }
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
        if (leaders.length > 0 && leaders[0].section_ids?.length > 0) {
          const sections = await base44.entities.Section.filter({ active: true });
          const leaderSections = sections.filter(s => leaders[0].section_ids.includes(s.id));
          setAvailableSections(leaderSections);
          if (leaderSections.length > 0) {
            const defaultExists = defaultId && leaderSections.find(s => s.id === defaultId);
            setSelectedSection(defaultExists ? defaultId : leaderSections[0].id);
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