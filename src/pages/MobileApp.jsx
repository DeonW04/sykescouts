import React, { useState, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppRole } from '../hooks/useAppRole';
import { usePushNotifications } from '../hooks/usePushNotifications';
import PushNotificationPrompt from '../components/pwa/PushNotificationPrompt';
import MobileOnboarding from './MobileOnboarding.jsx';
import MobileSettings from '../components/mobile/MobileSettings';
import MobileConsentFormFlow from '../components/mobile/MobileConsentFormFlow';

// ── Parent tabs ──
import { Home, User, Calendar, Tent, Award, Settings, Users, CheckSquare, Camera, Receipt } from 'lucide-react';
import MobileHome from '../components/mobile/MobileHome.jsx';
import MobileMyChild from '../components/mobile/MobileMyChild.jsx';
import MobileProgramme from '../components/mobile/MobileProgramme.jsx';
import MobileEvents from '../components/mobile/MobileEvents';
import MobileBadges from '../components/mobile/MobileBadges.jsx';

// ── Leader tabs ──
import LeaderHome from '../components/mobile/leader/LeaderHome.jsx';
import LeaderMembers from '../components/mobile/leader/LeaderMembers.jsx';
import LeaderProgramme from '../components/mobile/leader/LeaderProgramme.jsx';
import LeaderEvents from '../components/mobile/leader/LeaderEvents.jsx';
import LeaderAttendance from '../components/mobile/leader/LeaderAttendance.jsx';
import LeaderBadges from '../components/mobile/leader/LeaderBadges.jsx';
import LeaderGallery from '../components/mobile/leader/LeaderGallery.jsx';
import LeaderExpenses from '../components/mobile/leader/LeaderExpenses.jsx';

// ─── Section context (shared across all leader pages) ───────────────────────
export const LeaderSectionContext = createContext({ selectedSectionId: 'all', setSelectedSectionId: () => {} });
export const useLeaderSection = () => useContext(LeaderSectionContext);

// ─────────────────────────────────────────────
// Tab definitions per role
// ─────────────────────────────────────────────
const TABS_BY_ROLE = {
  parent: [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'child', label: 'My Child', icon: User },
    { id: 'programme', label: 'Programme', icon: Calendar },
    { id: 'events', label: 'Events', icon: Tent },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  leader: [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'programme', label: 'Programme', icon: Calendar },
    { id: 'events', label: 'Events', icon: Tent },
    { id: 'attendance', label: 'Register', icon: CheckSquare },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'gallery', label: 'Gallery', icon: Camera },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
};

const ACCENT_BY_ROLE = {
  parent: '#7413dc',
  leader: '#004851',
};

// ─────────────────────────────────────────────
// Bottom nav — scrollable horizontal pill bar
// ─────────────────────────────────────────────
function BottomNav({ tabs, activeTab, onTabChange, accent }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-gray-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex overflow-x-auto scrollbar-hide px-2 py-2 gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px] ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: accent } : {}}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Parent app
// ─────────────────────────────────────────────────────────────
function ParentApp({ user, activeTab, onTabChange }) {
  const [consentFlow, setConsentFlow] = useState(null); // { action, child, submission }

  const { data: children = [] } = useQuery({
    queryKey: ['mobile-children', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.Member.filter({});
      return all.filter(m => m.parent_one_email === user.email || m.parent_two_email === user.email);
    },
    enabled: !!user?.email,
  });

  const handleOpenConsentForm = async (action, child) => {
    // Load existing submission for this child
    const subs = await base44.entities.ConsentFormSubmission.filter({ form_id: action.consent_form_id, member_id: child.id });
    const submission = subs[0] || null;
    setConsentFlow({ action, child, submission });
  };

  if (consentFlow) {
    return (
      <MobileConsentFormFlow
        action={consentFlow.action}
        submission={consentFlow.submission}
        user={user}
        child={consentFlow.child}
        onBack={() => setConsentFlow(null)}
        onDone={() => setConsentFlow(null)}
      />
    );
  }

  switch (activeTab) {
    case 'home': return <MobileHome user={user} children={children} onTabChange={onTabChange} onOpenConsentForm={handleOpenConsentForm} />;
    case 'child': return <MobileMyChild user={user} children={children} />;
    case 'programme': return <MobileProgramme children={children} />;
    case 'events': return <MobileEvents children={children} user={user} />;
    case 'badges': return <MobileBadges children={children} />;
    case 'settings': return <MobileSettings user={user} role="parent" />;
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Leader app — sections loaded once, shared via context
// ─────────────────────────────────────────────────────────────
function LeaderApp({ user, leader, activeTab, onTabChange }) {
  const { selectedSectionId, setSelectedSectionId } = useLeaderSection();

  const { data: allSections = [] } = useQuery({
    queryKey: ['leader-app-sections', leader?.id, user?.id],
    queryFn: async () => {
      const allSecs = await base44.entities.Section.filter({ active: true });
      if (user?.role === 'admin') return allSecs;
      if (!leader?.section_ids?.length) return [];
      return allSecs.filter(s => leader.section_ids.includes(s.id));
    },
    enabled: !!user,
  });

  // Sections currently "active" — either the selected one or all if 'all'
  const activeSections = selectedSectionId === 'all'
    ? allSections
    : allSections.filter(s => s.id === selectedSectionId);

  const commonProps = { sections: activeSections, allSections };

  switch (activeTab) {
    case 'home': return <LeaderHome user={user} leader={leader} sections={activeSections} allSections={allSections} selectedSectionId={selectedSectionId} setSelectedSectionId={setSelectedSectionId} onTabChange={onTabChange} />;
    case 'members': return <LeaderMembers {...commonProps} />;
    case 'programme': return <LeaderProgramme {...commonProps} />;
    case 'events': return <LeaderEvents {...commonProps} />;
    case 'attendance': return <LeaderAttendance {...commonProps} />;
    case 'badges': return <LeaderBadges {...commonProps} />;
    case 'gallery': return <LeaderGallery sections={activeSections} user={user} />;
    case 'expenses': return <LeaderExpenses user={user} />;
    case 'settings': return <MobileSettings user={user} role="leader" />;
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────
export default function MobileApp() {
  const { role, user, leader, isLoading } = useAppRole();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedSectionId, setSelectedSectionId] = useState('all');
  const { showPrompt, requestPermission, dismissPrompt } = usePushNotifications({ enabled: true });

  if (isLoading || !role) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!user.onboarding_complete && role === 'parent') {
    return <MobileOnboarding user={user} onComplete={() => window.location.reload()} />;
  }

  const tabs = TABS_BY_ROLE[role] || TABS_BY_ROLE.parent;
  const accent = ACCENT_BY_ROLE[role] || '#7413dc';

  const renderContent = () => {
    switch (role) {
      case 'leader':
        return (
          <LeaderSectionContext.Provider value={{ selectedSectionId, setSelectedSectionId }}>
            <LeaderApp user={user} leader={leader} activeTab={activeTab} onTabChange={setActiveTab} />
          </LeaderSectionContext.Provider>
        );
      default:
        return <ParentApp user={user} activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-16">
        {renderContent()}
      </div>

      <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accent={accent} />

      {showPrompt && (
        <PushNotificationPrompt onAllow={requestPermission} onDismiss={dismissPrompt} />
      )}
    </div>
  );
}