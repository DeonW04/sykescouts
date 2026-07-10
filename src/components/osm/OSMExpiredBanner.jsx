import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Shows an "OSM connection expired" banner with a reconnect button.
 * onReconnected() is called after the OAuth flow completes and the user
 * returns to the page — giving the parent a chance to retry the sync.
 */
/**
 * Kicks off the OSM OAuth login flow, redirecting the browser to OSM.
 * Set retryFlag=true to store a sessionStorage marker so the caller can
 * auto-resume its action when the user returns after reconnecting.
 * Throws on failure so callers can handle their own loading state.
 */
export async function startOSMLogin({ retryFlag = false } = {}) {
  const res = await base44.functions.invoke('getOSMClientId', {});
  if (res.data.error) throw new Error('Could not get OSM client ID: ' + res.data.error);
  const clientId = res.data.client_id;
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  if (retryFlag) sessionStorage.setItem('osm_reconnect_retry', '1');
  const state = btoa(JSON.stringify({ returnTo: window.location.href, cv: codeVerifier }));
  const redirectUri = 'https://sykescouts.org/functions/osmOAuthCallback';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'section:member:write section:badge:write section:programme:write',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `https://www.onlinescoutmanager.co.uk/oauth/authorize?${params.toString()}`;
}

export default function OSMExpiredBanner({ onReconnected }) {
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await startOSMLogin({ retryFlag: !!onReconnected });
    } catch (e) {
      toast.error('Reconnect failed: ' + e.message);
      setReconnecting(false);
    }
  };

  return (
    <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-300 rounded-xl">
      <WifiOff className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-900">OSM Connection Expired</p>
        <p className="text-sm text-amber-700 mt-0.5">
          Your Online Scout Manager session has expired. Reconnect to continue syncing.
        </p>
      </div>
      <Button
        onClick={handleReconnect}
        disabled={reconnecting}
        className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
      >
        {reconnecting
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting…</>
          : <><RefreshCw className="w-4 h-4 mr-2" />Re-Connect OSM</>}
      </Button>
    </div>
  );
}

/**
 * Helper: checks whether the OSM connection is genuinely expired/unauthorized.
 * Only returns true on a real auth failure (auth_expired flag) — NOT on
 * config/data errors, which would otherwise trigger a false re-login loop.
 */
export async function isOSMExpired() {
  try {
    const res = await base44.functions.invoke('fetchOSMData', {});
    return res.data?.auth_expired === true;
  } catch (e) {
    // Only a 401 counts as expired; other failures are not auth issues
    return e?.response?.status === 401;
  }
}