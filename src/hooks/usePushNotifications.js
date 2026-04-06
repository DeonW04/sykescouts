import { useEffect, useState } from 'react';

const SW_URL = '/sw.js';
const ASKED_KEY = 'push_notifications_asked';

export function usePushNotifications({ enabled }) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === 'undefined') return;
    if (localStorage.getItem(ASKED_KEY)) return;
    if (Notification.permission !== 'default') {
      localStorage.setItem(ASKED_KEY, '1');
      return;
    }
    // Delay slightly to avoid showing immediately on first load
    const t = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(t);
  }, [enabled]);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register(SW_URL);
      return reg;
    } catch {
      return null;
    }
  };

  const requestPermission = async () => {
    localStorage.setItem(ASKED_KEY, '1');
    setShowPrompt(false);

    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      await registerServiceWorker();
    }
  };

  const dismissPrompt = () => {
    localStorage.setItem(ASKED_KEY, '1');
    setShowPrompt(false);
  };

  return { permission, showPrompt, requestPermission, dismissPrompt };
}