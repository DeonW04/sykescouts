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
      console.warn('Push not supported on this device');
      return;
    }
    try {
      // Register SW and wait for it to be fully active
      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready, state:', reg.active?.state);

      // Fetch the current VAPID public key from the backend (never use a cached/hardcoded one)
      const res = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidPublicKey = res?.data?.publicKey;
      if (!vapidPublicKey) {
        console.warn('[Push] VAPID public key not available from backend');
        return;
      }
      console.log('[Push] Got VAPID public key from backend');

      // IMPORTANT: If a stale subscription exists (e.g. from old VAPID keys), unsubscribe first.
      // A mismatch between the subscription's applicationServerKey and the current VAPID key
      // is the most common cause of 403 errors when sending notifications.
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        console.log('[Push] Unsubscribing stale existing subscription...');
        await existingSub.unsubscribe();
        console.log('[Push] Stale subscription removed');
      }

      // Subscribe with the current VAPID key
      console.log('[Push] Subscribing with new VAPID key...');
      let sub;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (subErr) {
        console.error('[Push] pushManager.subscribe() failed:', subErr.name, subErr.message);
        throw subErr;
      }
      console.log('[Push] Subscribed, endpoint:', sub.endpoint);

      // Serialise keys as base64url (no padding, url-safe) — this is what web-push expects.
      // Do NOT use btoa() directly as it produces standard base64 with +/= which web-push rejects.
      const p256dh = sub.getKey('p256dh');
      const auth = sub.getKey('auth');
      const subscriptionPayload = {
        endpoint: sub.endpoint,
        expirationTime: sub.expirationTime,
        keys: {
          p256dh: p256dh ? arrayBufferToBase64Url(p256dh) : null,
          auth: auth ? arrayBufferToBase64Url(auth) : null,
        },
      };

      const saveRes = await base44.functions.invoke('savePushSubscription', { subscription: subscriptionPayload });
      console.log('[Push] Subscription saved:', saveRes?.data);
    } catch (err) {
      console.error('[Push] Registration failed:', err.name, err.message);
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

// Convert base64url → Uint8Array (for applicationServerKey)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// Convert ArrayBuffer → base64url (no padding, url-safe) — required by web-push
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}