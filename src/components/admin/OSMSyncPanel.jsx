import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, Edit, Trash2, CheckCircle, XCircle, Link, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OSMSyncPanel() {
  const queryClient = useQueryClient();
  const [osmConnected, setOsmConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [matchingBadges, setMatchingBadges] = useState(false);
  const [badgeView, setBadgeView] = useState('osm');
  const [linkDialogBadge, setLinkDialogBadge] = useState(null);
  const [linkingTo, setLinkingTo] = useState('');

  const { data: settingsArr = [] } = useQuery({
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

  useEffect(() => {
    if (!settings?.osm_access_token) { setOsmConnected(false); return; }
    setCheckingConnection(true);
    base44.functions.invoke('fetchOSMData', {})
      .then(res => setOsmConnected(!res.data.error))
      .catch(() => setOsmConnected(false))
      .finally(() => setCheckingConnection(false));
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
      if (res.data.error) { toast.error('Could not get OSM client ID: ' + res.data.error); return; }
      const clientId = res.data.client_id;

      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const codeVerifier = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const state = btoa(JSON.stringify({ returnTo: window.location.href, cv: codeVerifier }));
      const redirectUri = encodeURIComponent(`https://sykescouts.org/functions/osmOAuthCallback`);
      window.location.href = `https://www.onlinescoutmanager.co.uk/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=section:member:read+section:badge:read+section:programme:read&state=${encodeURIComponent(state)}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    } catch (e) {
      toast.error('Reconnect failed: ' + e.message);
    }
  };

  const handleSyncBadges = async () => {
    setMatchingBadges(true);
    try {
      const res = await base44.functions.invoke('syncOSMBadges', {});
      if (res.data.error) { toast.error(res.data.error); }
      else { toast.success(`Synced ${res.data.badges_synced} OSM badges`); refetchOsmBadges(); }
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setMatchingBadges(false);
    }
  };

  const handleDeleteOsmBadge = async (badgeId) => {
    try {
      await base44.entities.OSMBadge.delete(badgeId);
      refetchOsmBadges();
      toast.success('OSM badge removed');
    } catch (e) {
      toast.error('Delete failed: ' + e.message);
    }
  };

  const handleSaveLink = async () => {
    if (!linkDialogBadge) return;
    try {
      await base44.entities.OSMBadge.update(linkDialogBadge.id, {
        linked_to_app_badge: linkingTo || null,
      });
      refetchOsmBadges();
      toast.success(linkingTo ? 'Badge linked' : 'Link removed');
      setLinkDialogBadge(null);
      setLinkingTo('');
    } catch (e) {
      toast.error('Failed to save link: ' + e.message);
    }
  };

  const setField = (k, v) => setSettingsForm(f => ({ ...f, [k]: v }));

  const osmUnlinkedCount = osmBadges.filter(b => !b.linked_to_app_badge).length;
  const appUnlinkedCount = badges.filter(b => !osmBadges.some(ob => ob.linked_to_app_badge === b.id)).length;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="badge-sync">Badge Sync</TabsTrigger>
        <TabsTrigger value="member-sync">Member Sync</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6">
        <Card className={osmConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {osmConnected
                  ? <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  : <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />}
                <div>
                  <p className={`font-semibold ${osmConnected ? 'text-green-800' : 'text-red-800'}`}>
                    {osmConnected ? 'OSM Account Connected' : 'OSM Connection Lost'}
                  </p>
                  <p className={`text-sm ${osmConnected ? 'text-green-700' : 'text-red-700'}`}>
                    {osmConnected ? 'OAuth 2.0 connection active' : 'Connection could not be verified. Please reconnect.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!osmConnected && (
                  <Button onClick={handleReconnect} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                    <Link className="w-4 h-4 mr-2" />Reconnect OSM
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    setCheckingConnection(true);
                    try {
                      const res = await base44.functions.invoke('fetchOSMData', {});
                      setOsmConnected(!res.data.error);
                    } catch { setOsmConnected(false); }
                    finally { setCheckingConnection(false); }
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

        <Card>
          <CardHeader><CardTitle>OSM Sync Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {settingsForm ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Sync Frequency</Label>
                    <Select value={settingsForm.sync_frequency} onValueChange={v => setField('sync_frequency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Switch checked={settingsForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                  <Label className="cursor-pointer">Scheduled sync active {settingsForm.is_active ? '(on)' : '(off)'}</Label>
                </div>
                {settings?.last_synced && (
                  <p className="text-sm text-gray-500">Last synced: {format(new Date(settings.last_synced), 'd MMM yyyy, HH:mm')}</p>
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
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Badge Sync</CardTitle>
                <CardDescription>Link OSM badges to your app badges</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${osmUnlinkedCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {osmUnlinkedCount} OSM unlinked
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${appUnlinkedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {appUnlinkedCount} app unlinked
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleSyncBadges} disabled={matchingBadges || !osmConnected} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                {matchingBadges
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                  : <><Zap className="w-4 h-4 mr-2" />Fetch OSM Badges</>}
              </Button>

              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setBadgeView('osm')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${badgeView === 'osm' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  OSM Badges ({osmBadges.length})
                </button>
                <button
                  onClick={() => setBadgeView('app')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${badgeView === 'app' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  My Badges ({badges.length})
                </button>
              </div>
            </div>

            {/* OSM Badges View */}
            {badgeView === 'osm' && (
              osmBadges.length === 0
                ? <p className="text-sm text-gray-500">No OSM badges fetched yet. Click "Fetch OSM Badges" above.</p>
                : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    <div className="grid grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg font-semibold text-xs sticky top-0">
                      <div>OSM ID</div><div>Name</div><div>Type</div><div>Linked To</div><div>Actions</div>
                    </div>
                    {osmBadges.map(badge => {
                      const linkedBadge = badges.find(b => b.id === badge.linked_to_app_badge);
                      return (
                        <div key={badge.id} className="grid grid-cols-5 gap-3 p-3 border rounded-lg items-center">
                          <div className="text-xs font-mono text-gray-500">{badge.osm_id}</div>
                          <div className="text-sm font-medium">{badge.name}</div>
                          <div><Badge variant="outline">{badge.badge_type}</Badge></div>
                          <div className="text-xs">
                            {linkedBadge
                              ? <span className="text-green-700 font-medium">{linkedBadge.name}</span>
                              : <span className="text-gray-400">Not linked</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setLinkDialogBadge(badge); setLinkingTo(badge.linked_to_app_badge || ''); }}
                            >
                              {badge.linked_to_app_badge
                                ? <><Edit className="w-3 h-3 mr-1" />Edit</>
                                : <><Link className="w-3 h-3 mr-1" />Link</>}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteOsmBadge(badge.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
            )}

            {/* My Badges View */}
            {badgeView === 'app' && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg font-semibold text-xs sticky top-0">
                  <div>Name</div><div>Section</div><div>Category</div><div>OSM Link</div>
                </div>
                {badges.map(badge => {
                  const linked = osmBadges.find(ob => ob.linked_to_app_badge === badge.id);
                  return (
                    <div key={badge.id} className={`grid grid-cols-4 gap-3 p-3 border rounded-lg items-center ${!linked ? 'border-amber-200 bg-amber-50' : ''}`}>
                      <div className="text-sm font-medium">{badge.name}</div>
                      <div className="text-xs capitalize text-gray-600">{badge.section}</div>
                      <div><Badge variant="outline" className="text-xs">{badge.category}</Badge></div>
                      <div className="text-xs">
                        {linked
                          ? <span className="text-green-700 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />{linked.name}</span>
                          : <span className="text-amber-600 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />No OSM link</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Link Dialog */}
        <Dialog open={!!linkDialogBadge} onOpenChange={(open) => { if (!open) { setLinkDialogBadge(null); setLinkingTo(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link OSM Badge: {linkDialogBadge?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Link to app badge</Label>
                <Select value={linkingTo || '__none__'} onValueChange={v => setLinkingTo(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a badge..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No link —</SelectItem>
                    {badges.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.section})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setLinkDialogBadge(null); setLinkingTo(''); }}>Cancel</Button>
              <Button onClick={handleSaveLink} className="bg-[#7413dc] hover:bg-[#5c0fb0]">Save Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {member.section_id && sections.find(s => s.id === member.section_id)?.display_name}
                      </p>
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