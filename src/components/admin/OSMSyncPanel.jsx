import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, Info, Edit, Trash2, CheckCircle, XCircle, Link, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OSMSyncPanel() {
  const queryClient = useQueryClient();
  const [osmConnected, setOsmConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [matchingBadges, setMatchingBadges] = useState(false);
  const [badgeMatches, setBadgeMatches] = useState(null);
  const [selectedBadgeMatches, setSelectedBadgeMatches] = useState([]);

  const { data: settingsArr = [], refetch: refetchSettings } = useQuery({
    queryKey: ['osm-settings'],
    queryFn: () => base44.entities.OSMSyncSettings.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: osmBadges = [], refetch: refetchOsmBadges } = useQuery({
    queryKey: ['osm-badges'],
    queryFn: () => base44.entities.OSMBadge.list('-created_date', 200),
  });

  const settings = settingsArr[0];

  // Check connection when opening
  useEffect(() => {
    const checkConnection = async () => {
      if (!settings?.osm_access_token) {
        setOsmConnected(false);
        return;
      }
      setCheckingConnection(true);
      try {
        const res = await base44.functions.invoke('fetchOSMData', {});
        setOsmConnected(!res.data.error);
      } catch {
        setOsmConnected(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    if (settings?.osm_access_token) checkConnection();
  }, [settings?.osm_access_token]);

  useEffect(() => {
    if (settings && !settingsForm) {
      setSettingsForm({
        sync_frequency: settings.sync_frequency || 'monthly',
        notification_emails: settings.notification_emails || '',
        is_active: settings.is_active !== false,
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      if (settings) {
        await base44.entities.OSMSyncSettings.update(settings.id, settingsForm);
      } else {
        await base44.entities.OSMSyncSettings.create(settingsForm);
      }
      queryClient.invalidateQueries({ queryKey: ['osm-settings'] });
      toast.success('OSM settings saved');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleReconnect = async () => {
    try {
      const res = await base44.functions.invoke('getOSMClientId', {});
      if (res.data.error) {
        toast.error('Could not get OSM client ID: ' + res.data.error);
        return;
      }
      const clientId = res.data.client_id;

      // Generate PKCE code_verifier and code_challenge
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const digest = await crypto.subtle.digest('SHA-256', data);
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // Encode verifier in state so callback can use it
      const state = btoa(JSON.stringify({ returnTo: window.location.href, cv: codeVerifier }));
      const redirectUri = encodeURIComponent(`https://sykescouts.org/functions/osmOAuthCallback`);

      const authUrl = `https://www.onlinescoutmanager.co.uk/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=section:member:read+section:badge:read+section:programme:read&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      window.location.href = authUrl;
    } catch (e) {
      toast.error('Reconnect failed: ' + e.message);
    }
  };

  const handleSyncBadges = async () => {
    setMatchingBadges(true);
    try {
      const res = await base44.functions.invoke('syncOSMBadges', {});
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`Synced ${res.data.badges_synced} OSM badges`);
        refetchOsmBadges();
      }
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setMatchingBadges(false);
    }
  };

  const setField = (k, v) => setSettingsForm(f => ({ ...f, [k]: v }));

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="badge-sync">Badge Sync</TabsTrigger>
        <TabsTrigger value="member-sync">Member Sync</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        {/* Connection Status */}
        <Card className={osmConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {osmConnected ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-semibold ${osmConnected ? 'text-green-800' : 'text-red-800'}`}>
                    {osmConnected ? 'OSM Account Connected' : 'OSM Connection Lost'}
                  </p>
                  {osmConnected ? (
                    <p className="text-sm text-green-700">OAuth 2.0 connection active</p>
                  ) : (
                    <p className="text-sm text-red-700">Connection could not be verified. Please reconnect.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!osmConnected && (
                  <Button onClick={handleReconnect} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                    <Link className="w-4 h-4 mr-2" />
                    Reconnect OSM
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    setCheckingConnection(true);
                    try {
                      const res = await base44.functions.invoke('fetchOSMData', {});
                      setOsmConnected(!res.data.error);
                    } catch {
                      setOsmConnected(false);
                    } finally {
                      setCheckingConnection(false);
                    }
                  }}
                  variant="outline"
                  disabled={checkingConnection}
                >
                  {checkingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Check Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>OSM Sync Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {settingsForm ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Sync Frequency</Label>
                    <Select value={settingsForm.sync_frequency} onValueChange={v => setField('sync_frequency', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="fortnightly">Fortnightly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notification Emails</Label>
                    <Input
                      value={settingsForm.notification_emails}
                      onChange={e => setField('notification_emails', e.target.value)}
                      placeholder="leader@scouts.org, another@scouts.org"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple addresses with a comma</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settingsForm.is_active}
                    onCheckedChange={v => setField('is_active', v)}
                  />
                  <Label className="cursor-pointer">
                    Scheduled sync active {settingsForm.is_active ? '(on)' : '(off)'}
                  </Label>
                </div>
                {settings?.last_synced && (
                  <p className="text-sm text-gray-500">
                    Last synced: {format(new Date(settings.last_synced), 'd MMM yyyy, HH:mm')}
                  </p>
                )}
                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Loading settings...</p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Badge Sync Tab */}
      <TabsContent value="badge-sync" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>OSM Badges</CardTitle>
            <CardDescription>View and manage available OSM badges for this section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSyncBadges}
              disabled={matchingBadges || !osmConnected}
              className="bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              {matchingBadges ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing badges...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Fetch OSM Badges
                </>
              )}
            </Button>

            <div className="text-sm text-gray-600 mt-4">
              Found {osmBadges.length} badges
            </div>

            {osmBadges.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-5 gap-4 p-3 bg-gray-50 rounded-lg font-semibold text-xs sticky top-0">
                  <div>OSM ID</div>
                  <div>Name</div>
                  <div>Type</div>
                  <div>Linked To</div>
                  <div>Actions</div>
                </div>
                {osmBadges.map(badge => (
                  <div key={badge.id} className="grid grid-cols-5 gap-4 p-3 border rounded-lg items-center">
                    <div className="text-xs font-mono">{badge.osm_id}</div>
                    <div className="text-sm">{badge.name}</div>
                    <div><Badge variant="outline">{badge.badge_type}</Badge></div>
                    <div className="text-xs text-gray-500">
                      {badge.linked_to_app_badge
                        ? badges.find(b => b.id === badge.linked_to_app_badge)?.name || 'Unknown'
                        : 'Not linked'}
                    </div>
                    <div className="text-xs">
                      {!badge.linked_to_app_badge && (
                        <Button size="sm" variant="outline">Link</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Member Sync Tab */}
      <TabsContent value="member-sync" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Member OSM Linking</CardTitle>
            <CardDescription>Link member records with their OSM IDs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {members.map(member => {
                const hasOsmId = !!member.osm_scoutid;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-xs text-gray-500">
                          {member.section_id && sections.find(s => s.id === member.section_id)?.display_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasOsmId ? (
                        <>
                          <Badge className="bg-green-100 text-green-800">ID: {member.osm_scoutid}</Badge>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </>
                      ) : (
                        <>
                          <Badge className="bg-red-100 text-red-800">Not linked</Badge>
                          <XCircle className="w-5 h-5 text-red-600" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}