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
export default function OSMExpiredBanner({ onReconnected }) {
  const [reconnecting, setReconnecting] = useState(false);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      const res = await base44.functions.invoke('getOSMClientId', {});
      if (res.data.error) { toast.error('Could not get OSM client ID: ' + res.data.error); setReconnecting(false); return; }
      const clientId = res.data.client_id;
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      // Store a "pending retry" flag so when we return we can auto-retry
      if (onReconnected) sessionStorage.setItem('osm_reconnect_retry', '1');
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
 * Helper: given any caught error or response error string, check whether
 * the OSM connection is alive. Returns true if connection is dead (expired).
 */
export async function isOSMExpired() {
  try {
    const res = await base44.functions.invoke('fetchOSMData', {});
    return !!res.data?.error;
  } catch {
    return true;
  }
}