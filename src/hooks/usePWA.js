import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function usePWA() {
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isLeaderOrAdmin, setIsLeaderOrAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Mobile detection
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth <= 768;
    setIsMobile(mobile);

    // PWA detection
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    setIsPWA(standalone);

    // Capture install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        setIsSignedIn(isAuth);
        if (!isAuth) {
          setIsLeaderOrAdmin(false);
          setIsCheckingRole(false);
          return;
        }
        const user = await base44.auth.me();
        if (user?.role === 'admin') {
          setIsLeaderOrAdmin(true);
          setIsCheckingRole(false);
          return;
        }
        const leaders = await base44.entities.Leader.filter({ user_id: user.id });
        setIsLeaderOrAdmin(leaders.length > 0);
      } catch {
        setIsLeaderOrAdmin(false);
        setIsSignedIn(false);
      } finally {
        setIsCheckingRole(false);
      }
    };
    checkRole();
  }, []);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const triggerInstallPrompt = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return {
    isMobile,
    isPWA,
    isSignedIn,
    isLeaderOrAdmin,
    isCheckingRole,
    isIOS,
    canInstall: !!deferredPrompt,
    triggerInstallPrompt,
  };
}