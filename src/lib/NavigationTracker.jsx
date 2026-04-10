import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';

// Map raw page keys to normalised display names (combines mobile+web)
const PAGE_LABEL_MAP = {
  ParentDashboard: 'Dashboard', MobileApp: 'Dashboard',
  MyChild: 'My Child', MobileMyChild: 'My Child',
  ParentProgramme: 'Programme', MobileProgramme: 'Programme',
  ParentEvents: 'Events', MobileEvents: 'Events', LeaderEvents: 'Events',
  ParentEventDetail: 'Events', MobileEventDetail: 'Events',
  ParentBadges: 'Badges', MobileBadges: 'Badges',
  ParentGoldAward: 'Gold Award', MobileGoldAward: 'Gold Award',
  MobileSettings: 'Settings',
  MobileConsentFormFlow: 'Consent Forms',
  CompleteRegistration: 'Registration',
  Home: 'Public Home',
  Gallery: 'Public Gallery',
  About: 'Public About',
};

function detectPlatform() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return 'pwa';
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  return isMobile ? 'mobile_web' : 'desktop_web';
}

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];
    const userRef = useRef(null);
    const parentCheckRef = useRef(null); // null = unknown, false = not parent, string = userId

    useEffect(() => {
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(key => key.toLowerCase() === pathSegment.toLowerCase());
            pageName = matchedKey || pathSegment || null;
        }

        if (!isAuthenticated || !pageName) return;

        // Fire base44 app log as before
        base44.appLogs.logUserInApp(pageName).catch(() => {});

        // Log parent activity
        const logParentActivity = async () => {
            try {
                // Load and cache the current user
                if (!userRef.current) {
                    userRef.current = await base44.auth.me();
                }
                const user = userRef.current;
                if (!user) return;

                // Check if parent: not admin AND not a leader
                if (parentCheckRef.current === null) {
                    if (user.role === 'admin') {
                        parentCheckRef.current = false;
                    } else {
                        const leaders = await base44.entities.Leader.filter({ user_id: user.id });
                        parentCheckRef.current = leaders.length === 0 ? user.id : false;
                    }
                }
                if (!parentCheckRef.current) return; // not a parent

                const normalised = PAGE_LABEL_MAP[pageName] || pageName.replace(/([A-Z])/g, ' $1').trim();
                const now = new Date();
                const platform = detectPlatform();

                await base44.entities.ParentActivity.create({
                    user_id: user.id,
                    user_email: user.email,
                    page_name: normalised,
                    raw_page: pageName,
                    platform,
                    timestamp: now.toISOString(),
                    session_date: now.toISOString().split('T')[0],
                });
            } catch (_) {
                // Silently fail
            }
        };

        logParentActivity();
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}