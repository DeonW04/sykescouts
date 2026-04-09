import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Toaster } from 'sonner';
import { HelmetProvider } from 'react-helmet-async';
import { SectionProvider } from './components/leader/SectionContext';
import SectionSelector from './components/leader/SectionSelector';
import SectionTransitionOverlay from './components/leader/SectionTransitionOverlay';
import { useSectionContext } from './components/leader/SectionContext';

function SectionTransitionWrapper() {
  const { transitioning, previousSection, pendingSectionId, onTransitionComplete, availableSections } = useSectionContext();

  if (!transitioning || !previousSection || !pendingSectionId) return null;

  const fromSec = availableSections.find(s => s.id === previousSection);
  const toSec = availableSections.find(s => s.id === pendingSectionId);

  return (
    <SectionTransitionOverlay
      fromSection={fromSec}
      toSection={toSec}
      onComplete={onTransitionComplete}
    />
  ); 
}

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const formatPageTitle = (pageName) => {
      if (!pageName) return '40th Rochdale (Syke) Scouts';
      const specialCases = {
        'Home': '40th Rochdale (Syke) Scouts',
        'ParentDashboard': 'Parent Dashboard',
        'LeaderDashboard': 'Leader Dashboard',
        'LeaderMembers': 'Members',
        'LeaderProgramme': 'Programme',
        'LeaderEvents': 'Events',
        'LeaderAttendance': 'Attendance',
        'LeaderBadges': 'Badges',
        'LeaderGallery': 'Gallery',
        'MyChild': 'My Child',
        'ParentProgramme': 'Programme',
        'ParentEvents': 'Events',
        'ParentBadges': 'Badges',
        'ParentEventDetail': 'Event Details',
        'ParentGoldAward': 'Gold Award',
        'MemberDetail': 'Member Details',
        'EventDetail': 'Event Details',
        'MeetingDetail': 'Meeting Details',
        'BadgeDetail': 'Badge Details',
        'RiskAssessmentDetail': 'Risk Assessment',
        'AdminSettings': 'Admin Settings',
        'CompleteRegistration': 'Complete Registration',
        'ArchivedMembers': 'Archived Members',
        'BadgeStockManagement': 'Badge Stock',
        'NightsAwayTracking': 'Nights Away Tracking',
        'RiskAssessments': 'Risk Assessments',
        'JoinEnquiries': 'Join Enquiries',
        'SharedPage': 'Shared Page',
        'IdeasBoard': 'Ideas Board',
      };
      if (specialCases[pageName]) return `${specialCases[pageName]} | 40th Rochdale (Syke) Scouts`;
      const formatted = pageName.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
      return `${formatted} | 40th Rochdale (Syke) Scouts`;
    };
    document.title = formatPageTitle(currentPageName);
  }, [currentPageName]);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.role === 'admin') {
          setIsLeader(true);
        } else {
          const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
          setIsLeader(leaders.length > 0);
        }
        // Redirect iPad accounts straight to the iPad kiosk
        if (currentUser.account_type === 'ipad' && currentPageName !== 'IpadApp') {
          window.location.href = '/ipad';
          return;
        }
        if (!currentUser.onboarding_complete && currentPageName !== 'CompleteRegistration' && currentUser.account_type !== 'ipad') {
      }
    } catch (error) {
      setUser(null);
      setIsLeader(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const leaderPages = ['LeaderDashboard', 'LeaderMembers', 'LeaderProgramme', 'MeetingDetail', 'MemberDetail', 'LeaderGallery', 'LeaderEvents', 'EventDetail', 'LeaderAttendance', 'LeaderBadges', 'BadgeDetail', 'AwardBadges', 'ManageBadges', 'EditBadgeStructure', 'StagedBadgeDetail', 'ManageStagedBadge', 'NightsAwayBadgeDetail', 'HikesAwayBadgeDetail', 'BadgeStockManagement', 'NightsAwayTracking', 'RiskAssessments', 'RiskAssessmentDetail', 'RiskAssessmentHistory', 'Communications', 'WeeklyMessage', 'WeeklyMessageList', 'MonthlyNewsletter', 'MonthlyNewsletterList', 'EventUpdate', 'EventUpdateList', 'JoinEnquiries', 'ArchivedMembers', 'GoldAwardDetail', 'IdeasBoard', 'AIProgrammePlanner', 'ConsentForms', 'ConsentFormBuilder'];
  const adminPages = ['AdminSettings'];
  const parentPages = ['ParentDashboard', 'MyChild', 'ParentProgramme', 'ParentEvents', 'ParentEventDetail', 'ParentBadges', 'ParentGoldAward', 'CompleteRegistration'];
  const protectedPages = [...leaderPages, ...adminPages, ...parentPages];
  const publicPages = ['Home', 'About', 'Sections', 'Parents', 'Gallery', 'Contact', 'Join', 'Volunteer', 'SharedPage'];

  useEffect(() => {
    if (!checkingAuth) {
      if (!user && protectedPages.includes(currentPageName) && !publicPages.includes(currentPageName)) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
        return;
      }
      if (user && user.role !== 'admin' && adminPages.includes(currentPageName)) {
        window.location.href = createPageUrl(isLeader ? 'LeaderDashboard' : 'ParentDashboard');
        return;
      }
      if (user && !isLeader && user.role !== 'admin' && leaderPages.includes(currentPageName)) {
        window.location.href = createPageUrl('ParentDashboard');
        return;
      }
      if (user && isLeader && user.role !== 'admin' && parentPages.includes(currentPageName)) {
        window.location.href = createPageUrl('LeaderDashboard');
        return;
      }
    }
  }, [user, isLeader, currentPageName, checkingAuth]);

  if (checkingAuth && protectedPages.includes(currentPageName)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: 'Home', page: '/', isRoot: true },
    { name: 'About Us', page: 'About' },
    { name: 'Our Sections', page: 'Sections' },
    { name: 'Parents', page: 'Parents' },
    { name: 'Gallery', page: 'Gallery' },
    { name: 'Contact', page: 'Contact' },
  ];

  return (
    <SectionProvider>
      <SectionTransitionWrapper />
      <HelmetProvider>
        <div className="min-h-screen flex flex-col bg-white">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800&display=swap');
            * { font-family: 'Nunito Sans', sans-serif !important; }
          `}</style>
          <Toaster position="top-right" />

          {/* Header */}
          <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                {/* Logo */}
                <Link to="/" className="flex items-center">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
                    alt="40th Rochdale (Syke) Scouts"
                    className="h-16 w-auto"
                  />
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.page}
                      to={link.isRoot ? link.page : createPageUrl(link.page)}
                      className={`text-sm font-medium transition-colors hover:text-[#7413dc] ${
                        (link.isRoot && currentPageName === 'Home') || currentPageName === link.page
                          ? 'text-[#7413dc]'
                          : 'text-gray-700'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>

                {/* Desktop CTA Buttons */}
                <div className="hidden lg:flex items-center gap-3">
                  {!user ? (
                    <>
                      <Link to={createPageUrl('Join')}>
                        <Button variant="outline" className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white">
                          Join Scouts
                        </Button>
                      </Link>
                      <Link to={createPageUrl('Volunteer')}>
                        <Button className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
                          Volunteer
                        </Button>
                      </Link>
                      <button
                        onClick={() => base44.auth.redirectToLogin()}
                        className="px-6 py-2 bg-[#004851] hover:bg-[#003840] text-white rounded-lg font-medium transition-colors"
                      >
                        Parent / Leader Sign In
                      </button>
                    </>
                  ) : (
                    <Link to={createPageUrl(isLeader ? 'LeaderDashboard' : 'ParentDashboard')}>
                      <Button className="bg-[#004851] hover:bg-[#003840] text-white">
                        {isLeader ? 'Leader Portal' : 'Parent Portal'}
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <button
                  className="lg:hidden p-2"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="w-6 h-6 text-gray-700" />
                  ) : (
                    <Menu className="w-6 h-6 text-gray-700" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Auth Bar — always visible below the header on mobile */}
            <div className="lg:hidden border-t border-gray-100 bg-gray-50 px-4 py-2">
              {!user ? (
                <div className="flex items-center gap-2">
                  <Link to={createPageUrl('Join')} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white text-xs"
                    >
                      Join Scouts
                    </Button>
                  </Link>
                  <Link to={createPageUrl('Volunteer')} className="flex-1">
                    <Button
                      size="sm"
                      className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] text-white text-xs"
                    >
                      Volunteer
                    </Button>
                  </Link>
                  <button
                    onClick={() => base44.auth.redirectToLogin()}
                    className="flex-1 px-3 py-1.5 bg-[#004851] hover:bg-[#003840] text-white rounded-lg font-medium transition-colors text-xs"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <Link to={createPageUrl(isLeader ? 'LeaderDashboard' : 'ParentDashboard')}>
                  <Button
                    size="sm"
                    className="w-full bg-[#004851] hover:bg-[#003840] text-white text-xs"
                  >
                    {isLeader ? 'Leader Portal' : 'Parent Portal'}
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Dropdown Menu — nav links only */}
            {mobileMenuOpen && (
              <div className="lg:hidden bg-white border-t border-gray-100 py-4">
                <nav className="flex flex-col px-4 space-y-3">
                  {navLinks.map((link) => (
                    <Link
                      key={link.page}
                      to={link.isRoot ? link.page : createPageUrl(link.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`py-2 text-base font-medium ${
                        (link.isRoot && currentPageName === 'Home') || currentPageName === link.page
                          ? 'text-[#7413dc]'
                          : 'text-gray-700'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </header>

          {/* Section Selector for Leaders */}
          {user && (isLeader || user.role === 'admin') && leaderPages.includes(currentPageName) && (
            <SectionSelector />
          )}

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                  <Link to="/" className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#7413dc] rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-6 h-6 text-white fill-current">
                        <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
                      </svg>
                    </div>
                    <span className="text-lg font-bold">40th Rochdale (Syke) Scouts</span>
                  </Link>
                  <p className="text-gray-400 text-sm max-w-md">
                    We help young people gain skills for life through adventure, outdoor activities, and community involvement.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Quick Links</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><Link to={createPageUrl('About')} className="hover:text-white transition-colors">About Us</Link></li>
                    <li><Link to={createPageUrl('Sections')} className="hover:text-white transition-colors">Our Sections</Link></li>
                    <li><Link to={createPageUrl('Parents')} className="hover:text-white transition-colors">Parent Info</Link></li>
                    <li><Link to={createPageUrl('Join')} className="hover:text-white transition-colors">Join Scouts</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Get in Touch</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li><Link to={createPageUrl('Volunteer')} className="hover:text-white transition-colors">Volunteer With Us</Link></li>
                    <li><Link to={createPageUrl('Contact')} className="hover:text-white transition-colors">Contact Us</Link></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-500">
                  © {new Date().getFullYear()} 40th Rochdale (Syke) Scouts. All rights reserved.
                </p>
                <div className="flex items-center gap-4">
                  {user && (
                    <button
                      onClick={() => base44.auth.logout()}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Sign Out
                    </button>
                  )}
                  <p className="text-xs text-gray-500">
                    Part of The Scout Association, registered charity number 306101 (England and Wales)
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </HelmetProvider>
    </SectionProvider>
  );
}