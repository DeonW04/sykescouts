import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAppRole } from '../hooks/useAppRole';
import { usePushNotifications } from '../hooks/usePushNotifications';
import PushNotificationPrompt from '../components/pwa/PushNotificationPrompt';
import MobileOnboarding from './MobileOnboarding.jsx';
import MobileSettings from '../components/mobile/MobileSettings';

// ── Parent tabs ──
import {
  Home, User, Calendar, Tent, Award, Settings,
  Users, CheckSquare, Camera, Receipt, LayoutGrid,
} from 'lucide-react';
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

// ─────────────────────────────────────────────
// Tab definitions per role.
// Future roles (ipad, member) can be added here
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
  // Future: ipad: [...], member: [...]
};

// Accent colour per role
const ACCENT_BY_ROLE = {
  parent: '#7413dc',
  leader: '#004851',
};

function BottomNav({ tabs, activeTab, onTabChange, accent }) {
  // Leaders have 9 tabs — show a 2-row scrollable pill nav instead of the usual bar
  if (tabs.length > 6) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-40 px-3 pt-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex flex-wrap justify-center gap-1.5 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={isActive ? { backgroundColor: accent, color: '#fff' } : {}}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${isActive ? '' : 'text-gray-500 bg-gray-100'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard icon bar for ≤6 tabs
  return (
    <div
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={isActive ? { color: accent } : {}}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isActive ? '' : 'text-gray-400'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>{tab.label}</span>
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
  const { data: children = [] } = useQuery({
    queryKey: ['mobile-children', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.Member.filter({});
      return all.filter(m => m.parent_one_email === user.email || m.parent_two_email === user.email);
    },
    enabled: !!user?.email,
  });

  switch (activeTab) {
    case 'home': return <MobileHome user={user} children={children} onTabChange={onTabChange} />;
    case 'child': return <MobileMyChild user={user} children={children} />;
    case 'programme': return <MobileProgramme children={children} />;
    case 'events': return <MobileEvents children={children} />;
    case 'badges': return <MobileBadges children={children} />;
    case 'settings': return <MobileSettings user={user} role="parent" />;
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Leader app
// ─────────────────────────────────────────────────────────────
function LeaderApp({ user, leader, activeTab, onTabChange }) {
  const { data: sections = [] } = useQuery({
    queryKey: ['leader-app-sections', leader?.id, user?.id],
    queryFn: async () => {
      const allSections = await base44.entities.Section.filter({ active: true });
      if (user?.role === 'admin') return allSections;
      if (!leader?.section_ids?.length) return [];
      return allSections.filter(s => leader.section_ids.includes(s.id));
    },
    enabled: !!user,
  });

  switch (activeTab) {
    case 'home': return <LeaderHome user={user} leader={leader} sections={sections} onTabChange={onTabChange} />;
    case 'members': return <LeaderMembers sections={sections} />;
    case 'programme': return <LeaderProgramme sections={sections} />;
    case 'events': return <LeaderEvents sections={sections} />;
    case 'attendance': return <LeaderAttendance sections={sections} />;
    case 'badges': return <LeaderBadges sections={sections} />;
    case 'gallery': return <LeaderGallery sections={sections} user={user} />;
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
  const { showPrompt, requestPermission, dismissPrompt } = usePushNotifications({ enabled: true });

  if (isLoading || !role) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Show onboarding for parents who haven't completed it
  if (!user.onboarding_complete && role === 'parent') {
    return <MobileOnboarding user={user} onComplete={() => window.location.reload()} />;
  }

  const tabs = TABS_BY_ROLE[role] || TABS_BY_ROLE.parent;
  const accent = ACCENT_BY_ROLE[role] || '#7413dc';

  // Bottom nav padding: pill nav for leaders (2 rows ~72px), bar for parents (~64px)
  const contentPb = tabs.length > 6 ? 'pb-24' : 'pb-20';

  const renderContent = () => {
    switch (role) {
      case 'leader': return <LeaderApp user={user} leader={leader} activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'parent': return <ParentApp user={user} activeTab={activeTab} onTabChange={setActiveTab} />;
      // Future: case 'ipad': return <IPadApp ... />;
      // Future: case 'member': return <MemberApp ... />;
      default: return <ParentApp user={user} activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      <div className={`flex-1 overflow-y-auto ${contentPb}`}>
        {renderContent()}
      </div>

      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accent={accent}
      />

      {showPrompt && (
        <PushNotificationPrompt onAllow={requestPermission} onDismiss={dismissPrompt} />
      )}
    </div>
  );
}