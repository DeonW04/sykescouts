import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, User, Calendar, Tent, Award, Settings } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import PushNotificationPrompt from '../components/pwa/PushNotificationPrompt';
import MobileOnboarding from './MobileOnboarding.jsx';
import MobileHome from '../components/mobile/MobileHome.jsx';
import MobileMyChild from '../components/mobile/MobileMyChild.jsx';
import MobileProgramme from '../components/mobile/MobileProgramme.jsx';
import MobileEvents from '../components/mobile/MobileEvents';
import MobileBadges from '../components/mobile/MobileBadges.jsx';
import MobileSettings from '../components/mobile/MobileSettings';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'child', label: 'My Child', icon: User },
  { id: 'programme', label: 'Programme', icon: Calendar },
  { id: 'events', label: 'Events', icon: Tent },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setAuthChecked(true); })
      .catch(() => { setAuthChecked(true); base44.auth.redirectToLogin('/app'); });
  }, []);

  const { data: children = [] } = useQuery({
    queryKey: ['mobile-children', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.Member.filter({});
      return all.filter(m => m.parent_one_email === user.email || m.parent_two_email === user.email);
    },
    enabled: !!user?.email,
  });

  const { showPrompt, requestPermission, dismissPrompt } = usePushNotifications({ enabled: true });

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return <MobileHome user={user} children={children} onTabChange={setActiveTab} />;
      case 'child': return <MobileMyChild user={user} children={children} />;
      case 'programme': return <MobileProgramme children={children} />;
      case 'events': return <MobileEvents children={children} />;
      case 'badges': return <MobileBadges children={children} />;
      case 'settings': return <MobileSettings user={user} />;
      default: return null;
    }
  };

  // Show onboarding inline if not complete
  if (authChecked && user && !user.onboarding_complete) {
    return <MobileOnboarding user={user} onComplete={() => window.location.reload()} />;
  }

  // Show spinner while checking auth
  if (!authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Safe area top padding for notched phones */}
      <div className="flex-1 overflow-y-auto pb-20">
        {renderTab()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  isActive ? 'text-[#7413dc]' : 'text-gray-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 w-8 h-0.5 bg-[#7413dc] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showPrompt && (
        <PushNotificationPrompt
          onAllow={requestPermission}
          onDismiss={dismissPrompt}
        />
      )}
    </div>
  );
}