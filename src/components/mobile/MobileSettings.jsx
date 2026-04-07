import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff, BellRing, LogOut, ChevronRight, User } from 'lucide-react';
import { toast } from 'sonner';

const SW_URL = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function MobileSettings({ user }) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notifications not supported on this device');
      return;
    }

    setRegistering(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Permission denied. Please enable notifications in your browser/device settings.');
        return;
      }

      // Register service worker and subscribe
      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;

      const res = await base44.functions.invoke('getVapidPublicKey', {});
      const vapidPublicKey = res?.data?.publicKey;
      if (!vapidPublicKey) throw new Error('Could not load notification config');

      // Unsubscribe stale subscription first (old VAPID key = 403 on send)
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        console.log('[Push] Unsubscribing stale subscription...');
        await existingSub.unsubscribe();
      }

      let sub;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (subErr) {
        console.error('[Push] subscribe() failed:', subErr.name, subErr.message);
        throw new Error(`Subscribe failed: ${subErr.name} — ${subErr.message}`);
      }

      // Use base64url encoding (no padding) — required by web-push on the backend
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
      await base44.functions.invoke('savePushSubscription', { subscription: subscriptionPayload });
      toast.success('Notifications enabled! ✅');
      localStorage.setItem('push_notifications_asked', '1');
    } catch (err) {
      toast.error('Failed to enable notifications: ' + err.message);
    } finally {
      setRegistering(false);
    }
  };

  const permissionLabel = {
    granted: 'Enabled',
    denied: 'Blocked in browser settings',
    default: 'Not set up yet',
  }[permission] || 'Unknown';

  const permissionColor = {
    granted: 'text-green-600',
    denied: 'text-red-500',
    default: 'text-orange-500',
  }[permission] || 'text-gray-500';

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-5 pt-12 pb-8 text-white">
        <h1 className="text-2xl font-bold">Settings</h1>
        {user && <p className="text-white/60 text-sm mt-1">{user.email}</p>}
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Notifications */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Notifications</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                permission === 'granted' ? 'bg-green-100' : 'bg-orange-100'
              }`}>
                {permission === 'granted'
                  ? <BellRing className="w-5 h-5 text-green-600" />
                  : <BellOff className="w-5 h-5 text-orange-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Push Notifications</p>
                <p className={`text-xs mt-0.5 ${permissionColor}`}>{permissionLabel}</p>
              </div>
              {permission !== 'granted' && permission !== 'denied' && (
                <button
                  onClick={enableNotifications}
                  disabled={registering}
                  className="px-4 py-2 bg-[#7413dc] text-white rounded-xl text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {registering ? 'Setting up…' : 'Enable'}
                </button>
              )}
              {permission === 'denied' && (
                <span className="text-xs text-red-400 font-medium text-right max-w-[120px] leading-tight">
                  Enable in device settings
                </span>
              )}
              {permission === 'granted' && (
                <button
                  onClick={enableNotifications}
                  disabled={registering}
                  className="px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {registering ? 'Re-registering…' : 'Re-register'}
                </button>
              )}
            </div>
            {permission === 'denied' && (
              <div className="px-4 pb-4 pt-0">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">
                  Notifications are blocked. To enable them:<br />
                  <strong>iOS:</strong> Settings → Safari → Advanced → Website Data, or check Notifications in Settings.<br />
                  <strong>Android:</strong> Settings → Apps → your browser → Notifications.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Account */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Account</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-gray-50">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{user?.full_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-4 p-4 text-left active:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="font-semibold text-red-500 text-sm flex-1">Sign Out</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}