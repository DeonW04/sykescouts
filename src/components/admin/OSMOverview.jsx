import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Loader2, Link, RotateCcw, User, Building, Calendar, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OSMOverview() {
  const queryClient = useQueryClient();
  const [osmConnected, setOsmConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [osmInfo, setOsmInfo] = useState(null);
  const [resetting, setResetting] = useState(false);

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['osm-settings'],
    queryFn: () => base44.entities.OSMSyncSettings.filter({}),
  });
  const { data: pendingSync = [] } = useQuery({
    queryKey: ['pending-badge-sync'],
    queryFn: () => base44.entities.PendingBadgeSync.filter({ status: 'pending' }),
  });
  const { data: osmBadges = [] } = useQuery({
    queryKey: ['osm-badges'],
    queryFn: () => base44.entities.OSMBadge.list('-created_date', 200),
  });

  const settings = settingsArr[0];

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      const res = await base44.functions.invoke('fetchOSMData', {});
      const connected = !res.data.error;
      setOsmConnected(connected);
      if (connected && res.data) {
        setOsmInfo(res.data);
      }
    } catch {
      setOsmConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  useEffect(() => {
    if (settings?.osm_access_token) {
      checkConnection();
    }
  }, [settings?.osm_access_token]);

  const handleReconnect = async () => {
    try {
      const res = await base44.functions.invoke('getOSMClientId', {});
      if (res.data.error) { toast.error('Could not get OSM client ID: ' + res.data.error); return; }
      const clientId = res.data.client_id;
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      // Store codeVerifier in sessionStorage so we can retrieve it in the callback
      const stateToken = crypto.randomUUID();
      sessionStorage.setItem(`osm_cv_${stateToken}`, codeVerifier);
      const state = btoa(JSON.stringify({ returnTo: window.location.href, cv: codeVerifier, st: stateToken }));
      const redirectUri = 'https://sykescouts.org/functions/osmOAuthCallback';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'section:member:write section:badge:write section:programme:read',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      window.location.href = `https://www.onlinescoutmanager.co.uk/oauth/authorize?${params.toString()}`;
    } catch (e) { toast.error('Reconnect failed: ' + e.message); }
  };

  const handleResetSync = async () => {
    if (!confirm('This will clear the OSM connection and re-authenticate. Are you sure?')) return;
    setResetting(true);
    try {
      if (settings) {
        await base44.entities.OSMSyncSettings.update(settings.id, {
          osm_access_token: null,
          osm_refresh_token: null,
          osm_token_expires_at: null,
        });
        queryClient.invalidateQueries({ queryKey: ['osm-settings'] });
        toast.success('OSM connection cleared. Redirecting to reconnect...');
        setTimeout(() => handleReconnect(), 1000);
      }
    } catch (e) {
      toast.error('Reset failed: ' + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className={osmConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {checkingConnection ? (
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              ) : osmConnected ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className={`font-semibold ${osmConnected ? 'text-green-800' : 'text-red-800'}`}>
                  {checkingConnection ? 'Checking connection...' : osmConnected ? 'OSM Account Connected' : 'OSM Connection Lost'}
                </p>
                <p className={`text-sm ${osmConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {osmConnected ? 'OAuth 2.0 connection active' : 'Connection could not be verified. Please reconnect.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!osmConnected && (
                <Button onClick={handleReconnect} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                  <Link className="w-4 h-4 mr-2" />Reconnect OSM
                </Button>
              )}
              <Button variant="outline" disabled={checkingConnection} onClick={checkConnection}>
                {checkingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Check Connection
              </Button>
              <Button variant="outline" disabled={resetting} onClick={handleResetSync} className="border-orange-300 text-orange-700 hover:bg-orange-50">
                {resetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Reset & Re-sync
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Wifi className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Connection Status</p>
              <p className="font-semibold">{osmConnected ? 'Active' : 'Disconnected'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">OSM Badges Loaded</p>
              <p className="font-semibold">{osmBadges.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingSync.length > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
              <Calendar className={`w-5 h-5 ${pendingSync.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Badge Syncs</p>
              <p className="font-semibold">{pendingSync.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Info */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Configuration</CardTitle>
            <CardDescription>Current OSM sync settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Sync Frequency</p>
                <p className="font-medium capitalize">{settings.sync_frequency || 'Monthly'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Scheduled Sync</p>
                <Badge className={settings.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {settings.is_active !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {settings.last_synced && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Last Synced</p>
                  <p className="font-medium">{format(new Date(settings.last_synced), 'd MMM yyyy, HH:mm')}</p>
                </div>
              )}
              {settings.notification_emails && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Notification Emails</p>
                  <p className="font-medium text-sm">{settings.notification_emails}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Info */}
      {settings?.osm_token_expires_at && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4" />Token Info</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Token expires: <span className="font-medium">{format(new Date(settings.osm_token_expires_at), 'd MMM yyyy, HH:mm')}</span>
              {new Date(settings.osm_token_expires_at) < new Date() && (
                <Badge className="ml-2 bg-red-100 text-red-800">Expired</Badge>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}