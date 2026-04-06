import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

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

    // If permission already granted, silently re-register subscription in case it was lost
    if (Notification.permission === 'granted') {
      registerAndSubscribe();
      localStorage.setItem(ASKED_KEY, '1');
      return;
    }

    if (localStorage.getItem(ASKED_KEY)) return;
    if (Notification.permission !== 'default') {
      localStorage.setItem(ASKED_KEY, '1');
      return;
    }
    const t = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(t);
  }, [enabled]);

  const registerAndSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;
      console.log('Service worker ready');

      // Fetch VAPID public key from backend
      const res = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidPublicKey = res?.data?.publicKey;
      if (!vapidPublicKey) {
        console.warn('VAPID public key not available');
        return;
      }
      console.log('Got VAPID key, subscribing...');

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('Push subscribed, saving...', sub.endpoint);
      const saveRes = await base44.functions.invoke('savePushSubscription', { subscription: sub.toJSON() });
      console.log('Subscription saved:', saveRes?.data);
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  };

  const requestPermission = async () => {
    localStorage.setItem(ASKED_KEY, '1');
    setShowPrompt(false);
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await registerAndSubscribe();
    }
  };

  const dismissPrompt = () => {
    localStorage.setItem(ASKED_KEY, '1');
    setShowPrompt(false);
  };

  return { permission, showPrompt, requestPermission, dismissPrompt };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}