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
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, Edit, Trash2, CheckCircle, XCircle, Link, Zap, Sparkles } from 'lucide-react';
import OSMProgrammeSyncPanel from '../osm/OSMProgrammeSyncPanel';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OSMSyncPanel({ defaultTab }) {
  const queryClient = useQueryClient();
  const [osmConnected, setOsmConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [matchingBadges, setMatchingBadges] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const [badgeView, setBadgeView] = useState('osm');

  // Filter/sort state
  const [filterType, setFilterType] = useState('all');
  const [filterLinked, setFilterLinked] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // OSM → App link dialog
  const [linkDialogBadge, setLinkDialogBadge] = useState(null);
  const [linkingTo, setLinkingTo] = useState('');
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // App → OSM link dialog
  const [appLinkDialog, setAppLinkDialog] = useState(null);
  const [appLinkingTo, setAppLinkingTo] = useState('');
  const [appAiSuggesting, setAppAiSuggesting] = useState(false);
  const [appAiSuggestion, setAppAiSuggestion] = useState(null);

  const { data: settingsArr = [] } = useQuery({ queryKey: ['osm-settings'], queryFn: () => base44.entities.OSMSyncSettings.filter({}) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: badges = [] } = useQuery({ queryKey: ['badges'], queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }) });
  const { data: osmBadges = [], refetch: refetchOsmBadges } = useQuery({ queryKey: ['osm-badges'], queryFn: () => base44.entities.OSMBadge.list('-created_date', 200) });

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
      setSettingsForm({ sync_frequency: settings.sync_frequency || 'monthly', notification_emails: settings.notification_emails || '', is_active: settings.is_active !== false });
    }
  }, [settings]);

  // AI suggestion for OSM → App dialog
  useEffect(() => {
    if (!linkDialogBadge || badges.length === 0) return;
    setAiSuggestion(null);
    setAiSuggesting(true);
    const badgeList = badges.map(b => `${b.id}: ${b.name}${b.stage_number ? ` Stage ${b.stage_number}` : ''} (${b.section}, ${b.category})`).join('\n');
    base44.integrations.Core.InvokeLLM({
      prompt: `I have an OSM badge called "${linkDialogBadge.name}" (type: ${linkDialogBadge.badge_type}). Find the best matching badge from:\n${badgeList}\nReturn JSON with best match. null for badge_id if no good match.`,
      response_json_schema: { type: 'object', properties: { badge_id: { type: 'string' }, badge_name: { type: 'string' }, reasoning: { type: 'string' } } },
    }).then(r => { if (r?.badge_id) setAiSuggestion(r); }).catch(() => {}).finally(() => setAiSuggesting(false));
  }, [linkDialogBadge]);

  // AI suggestion for App → OSM dialog
  useEffect(() => {
    if (!appLinkDialog || osmBadges.length === 0) return;
    setAppAiSuggestion(null);
    setAppAiSuggesting(true);
    const osmList = osmBadges.map(b => `${b.id}: ${b.name} (${b.badge_type})`).join('\n');
    base44.integrations.Core.InvokeLLM({
      prompt: `I have an app badge called "${appLinkDialog.name}"${appLinkDialog.stage_number ? ` Stage ${appLinkDialog.stage_number}` : ''} (section: ${appLinkDialog.section}, category: ${appLinkDialog.category}). Find the best matching OSM badge from:\n${osmList}\nReturn JSON with best match. null for badge_id if no good match.`,
      response_json_schema: { type: 'object', properties: { badge_id: { type: 'string' }, badge_name: { type: 'string' }, reasoning: { type: 'string' } } },
    }).then(r => { if (r?.badge_id) setAppAiSuggestion(r); }).catch(() => {}).finally(() => setAppAiSuggesting(false));
  }, [appLinkDialog]);

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      if (settings) { await base44.entities.OSMSyncSettings.update(settings.id, settingsForm); }
      else { await base44.entities.OSMSyncSettings.create(settingsForm); }
      queryClient.invalidateQueries({ queryKey: ['osm-settings'] });
      toast.success('OSM settings saved');
    } catch (e) { toast.error('Failed to save: ' + e.message); }
    finally { setSavingSettings(false); }
  };

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
      const state = btoa(JSON.stringify({ returnTo: window.location.href, cv: codeVerifier }));
      const redirectUri = 'https://sykescouts.org/functions/osmOAuthCallback';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'section:member:write section:badge:write section:programme:write',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      window.location.href = `https://www.onlinescoutmanager.co.uk/oauth/authorize?${params.toString()}`;
    } catch (e) { toast.error('Reconnect failed: ' + e.message); }
  };

  const handleSyncBadges = async () => {
    setMatchingBadges(true);
    try {
      const res = await base44.functions.invoke('syncOSMBadges', {});
      if (res.data.error) { toast.error(res.data.error); }
      else { toast.success(`Synced ${res.data.badges_synced} OSM badges`); refetchOsmBadges(); }
    } catch (e) { toast.error('Sync failed: ' + e.message); }
    finally { setMatchingBadges(false); }
  };

  const handleDeleteOsmBadge = async (badgeId) => {
    try { await base44.entities.OSMBadge.delete(badgeId); refetchOsmBadges(); toast.success('OSM badge removed'); }
    catch (e) { toast.error('Delete failed: ' + e.message); }
  };

  const handleAutoLink = async () => {
    setAutoLinking(true);
    let linked = 0;
    try {
      const updates = [];
      for (const ob of osmBadges) {
        if (ob.linked_to_app_badge) continue;
        const match = badges.find(b => b.name.trim().toLowerCase() === ob.name.trim().toLowerCase());
        if (match) { updates.push(base44.entities.OSMBadge.update(ob.id, { linked_to_app_badge: match.id })); linked++; }
      }
      await Promise.all(updates);
      refetchOsmBadges();
      toast.success(`Auto-linked ${linked} badge${linked !== 1 ? 's' : ''} by name`);
    } catch (e) { toast.error('Auto-link failed: ' + e.message); }
    finally { setAutoLinking(false); }
  };

  const handleSaveLink = async () => {
    if (!linkDialogBadge) return;
    try {
      await base44.entities.OSMBadge.update(linkDialogBadge.id, { linked_to_app_badge: linkingTo || null });
      refetchOsmBadges();
      toast.success(linkingTo ? 'Badge linked' : 'Link removed');
      setLinkDialogBadge(null); setLinkingTo(''); setAiSuggestion(null);
    } catch (e) { toast.error('Failed to save link: ' + e.message); }
  };

  const handleSaveAppLink = async () => {
    if (!appLinkDialog) return;
    try {
      const prev = osmBadges.find(ob => ob.linked_to_app_badge === appLinkDialog.id);
      if (prev && prev.id !== appLinkingTo) { await base44.entities.OSMBadge.update(prev.id, { linked_to_app_badge: null }); }
      if (appLinkingTo) { await base44.entities.OSMBadge.update(appLinkingTo, { linked_to_app_badge: appLinkDialog.id }); }
      refetchOsmBadges();
      toast.success(appLinkingTo ? 'Badge linked' : 'Link removed');
      setAppLinkDialog(null); setAppLinkingTo(''); setAppAiSuggestion(null);
    } catch (e) { toast.error('Failed to save link: ' + e.message); }
  };

  const setField = (k, v) => setSettingsForm(f => ({ ...f, [k]: v }));
  const osmUnlinkedCount = osmBadges.filter(b => !b.linked_to_app_badge).length;
  const appUnlinkedCount = badges.filter(b => !osmBadges.some(ob => ob.linked_to_app_badge === b.id)).length;

  const filteredOsmBadges = osmBadges
    .filter(b => filterType === 'all' || b.badge_type === filterType)
    .filter(b => filterLinked === 'all' ? true : filterLinked === 'linked' ? !!b.linked_to_app_badge : !b.linked_to_app_badge)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'type') return a.badge_type.localeCompare(b.badge_type);
      if (sortBy === 'linked') return (!!b.linked_to_app_badge) - (!!a.linked_to_app_badge);
      return 0;
    });

  const sortedBadgesForDropdown = [...badges].sort((a, b) => {
    if (a.stage_number && b.stage_number) return a.name.localeCompare(b.name) || (a.stage_number - b.stage_number);
    if (a.stage_number) return 1;
    if (b.stage_number) return -1;
    return a.name.localeCompare(b.name);
  });

  // Render only the requested section — no internal tab strip
  const activePanel = defaultTab || 'badge-sync';

  return (
    <div className="w-full">

      {/* ── Overview ── */}
      {activePanel === 'overview' && <div className="space-y-6">
        <Card className={osmConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {osmConnected ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
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
                <Button variant="outline" disabled={checkingConnection} onClick={async () => {
                  setCheckingConnection(true);
                  try { const res = await base44.functions.invoke('fetchOSMData', {}); setOsmConnected(!res.data.error); }
                  catch { setOsmConnected(false); } finally { setCheckingConnection(false); }
                }}>
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
                    <Input value={settingsForm.notification_emails} onChange={e => setField('notification_emails', e.target.value)} placeholder="leader@scouts.org" />
                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settingsForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                  <Label>Scheduled sync {settingsForm.is_active ? 'on' : 'off'}</Label>
                </div>
                {settings?.last_synced && <p className="text-sm text-gray-500">Last synced: {format(new Date(settings.last_synced), 'd MMM yyyy, HH:mm')}</p>}
                <Button onClick={handleSaveSettings} disabled={savingSettings}>{savingSettings ? 'Saving...' : 'Save Settings'}</Button>
              </>
            ) : <p className="text-sm text-gray-500">Loading settings...</p>}
          </CardContent>
        </Card>
      </div>}

      {/* ── Badge Sync ── */}
      {activePanel === 'badge-sync' && <div className="space-y-4">
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

            {/* Action buttons + view toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleSyncBadges} disabled={matchingBadges || !osmConnected} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                {matchingBadges ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</> : <><Zap className="w-4 h-4 mr-2" />Fetch OSM Badges</>}
              </Button>
              <Button variant="outline" onClick={handleAutoLink} disabled={autoLinking || osmBadges.length === 0}>
                {autoLinking ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Linking...</> : <><CheckCircle className="w-4 h-4 mr-2" />Auto-Link by Name</>}
              </Button>
              <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 ml-auto">
                <button onClick={() => setBadgeView('osm')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${badgeView === 'osm' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  OSM Badges ({osmBadges.length})
                </button>
                <button onClick={() => setBadgeView('app')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${badgeView === 'app' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  My Badges ({badges.length})
                </button>
              </div>
            </div>

            {/* ── OSM Badges View ── */}
            {badgeView === 'osm' && (
              osmBadges.length === 0
                ? <p className="text-sm text-gray-500">No OSM badges yet. Click "Fetch OSM Badges" above.</p>
                : <>
                  {/* Filter bar */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 items-center p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-500">Type:</span>
                      {['all', 'Challenge', 'Activity', 'Staged', 'Core'].map(t => (
                        <button key={t} onClick={() => setFilterType(t)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${filterType === t ? 'bg-[#7413dc] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                          {t === 'all' ? 'All' : t}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-500">Status:</span>
                      {[['all', 'All'], ['linked', 'Linked'], ['unlinked', 'Unlinked']].map(([v, l]) => (
                        <button key={v} onClick={() => setFilterLinked(v)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${filterLinked === v ? 'bg-[#7413dc] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-500">Sort:</span>
                      <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-0.5 bg-white">
                        <option value="name">Name</option>
                        <option value="type">Type</option>
                        <option value="linked">Linked first</option>
                      </select>
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">{filteredOsmBadges.length} of {osmBadges.length}</span>
                  </div>

                  <div className="space-y-1 max-h-[500px] overflow-y-auto">
                    <div className="grid grid-cols-5 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-xs sticky top-0">
                      <div>OSM ID</div><div>Name</div><div>Type</div><div>Linked To</div><div>Actions</div>
                    </div>
                    {filteredOsmBadges.map(badge => {
                      const linkedBadge = badges.find(b => b.id === badge.linked_to_app_badge);
                      return (
                        <div key={badge.id} className="grid grid-cols-5 gap-3 px-3 py-2.5 border rounded-lg items-center hover:bg-gray-50">
                          <div className="text-xs font-mono text-gray-400">{badge.osm_id}</div>
                          <div className="text-sm font-medium">{badge.name}</div>
                          <div><Badge variant="outline" className="text-xs">{badge.badge_type}</Badge></div>
                          <div className="text-xs">
                            {linkedBadge
                              ? <span className="text-green-700 font-medium">{linkedBadge.name}{linkedBadge.stage_number ? ` (Stage ${linkedBadge.stage_number})` : ''}</span>
                              : <span className="text-gray-400">Not linked</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => { setLinkDialogBadge(badge); setLinkingTo(badge.linked_to_app_badge || ''); setAiSuggestion(null); }}>
                              {badge.linked_to_app_badge ? <><Edit className="w-3 h-3 mr-1" />Edit</> : <><Link className="w-3 h-3 mr-1" />Link</>}
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteOsmBadge(badge.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
            )}

            {/* ── My Badges View ── */}
            {badgeView === 'app' && (
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                <div className="grid grid-cols-5 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-xs sticky top-0">
                  <div>Name</div><div>Section</div><div>Category</div><div>OSM Link</div><div>Actions</div>
                </div>
                {badges.map(badge => {
                  const linked = osmBadges.find(ob => ob.linked_to_app_badge === badge.id);
                  return (
                    <div key={badge.id} className={`grid grid-cols-5 gap-3 px-3 py-2.5 border rounded-lg items-center ${!linked ? 'border-amber-200 bg-amber-50' : 'hover:bg-gray-50'}`}>
                      <div className="text-sm font-medium">{badge.name}{badge.stage_number ? <span className="ml-1 text-xs text-gray-500">Stage {badge.stage_number}</span> : ''}</div>
                      <div className="text-xs capitalize text-gray-600">{badge.section}</div>
                      <div><Badge variant="outline" className="text-xs">{badge.category}</Badge></div>
                      <div className="text-xs">
                        {linked
                          ? <span className="text-green-700 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />{linked.name}</span>
                          : <span className="text-amber-600 flex items-center gap-1"><XCircle className="w-3 h-3" />No OSM link</span>}
                      </div>
                      <div>
                        <Button size="sm" variant="outline" onClick={() => { setAppLinkDialog(badge); setAppLinkingTo(linked?.id || ''); setAppAiSuggestion(null); }}>
                          {linked ? <><Edit className="w-3 h-3 mr-1" />Edit</> : <><Link className="w-3 h-3 mr-1" />Link</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* OSM → App Link Dialog */}
        <Dialog open={!!linkDialogBadge} onOpenChange={open => { if (!open) { setLinkDialogBadge(null); setLinkingTo(''); setAiSuggestion(null); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Link OSM Badge: {linkDialogBadge?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              {linkDialogBadge?.badge_type === 'Staged' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <strong>Staged badge:</strong> In OSM, each stage is a separate badge entry. Link each OSM stage entry (e.g. "Hikes Away Stage 1") to the matching stage in your app. When you award a stage, only that specific OSM stage badge will be pushed — not higher stages.
                </div>
              )}
              {aiSuggesting && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                  <Loader2 className="w-4 h-4 animate-spin" />Getting AI suggestion...
                </div>
              )}
              {!aiSuggesting && aiSuggestion && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-800"><Sparkles className="w-4 h-4" />AI Suggestion</div>
                  <p className="text-sm text-purple-700">{aiSuggestion.reasoning}</p>
                  <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100" onClick={() => setLinkingTo(aiSuggestion.badge_id)}>
                    Use: {aiSuggestion.badge_name}
                  </Button>
                </div>
              )}
              <div>
                <Label>Link to app badge</Label>
                <Select value={linkingTo || '__none__'} onValueChange={v => setLinkingTo(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select a badge..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No link —</SelectItem>
                    {sortedBadgesForDropdown.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}{b.stage_number ? ` — Stage ${b.stage_number}` : ''} ({b.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setLinkDialogBadge(null); setLinkingTo(''); setAiSuggestion(null); }}>Cancel</Button>
              <Button onClick={handleSaveLink} className="bg-[#7413dc] hover:bg-[#5c0fb0]">Save Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* App → OSM Link Dialog */}
        <Dialog open={!!appLinkDialog} onOpenChange={open => { if (!open) { setAppLinkDialog(null); setAppLinkingTo(''); setAppAiSuggestion(null); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Link App Badge: {appLinkDialog?.name}{appLinkDialog?.stage_number ? ` — Stage ${appLinkDialog.stage_number}` : ''}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              {appLinkDialog?.category === 'staged' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <strong>Staged badge:</strong> Select the specific OSM stage entry for this stage only.
                </div>
              )}
              {appAiSuggesting && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                  <Loader2 className="w-4 h-4 animate-spin" />Getting AI suggestion...
                </div>
              )}
              {!appAiSuggesting && appAiSuggestion && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-purple-800"><Sparkles className="w-4 h-4" />AI Suggestion</div>
                  <p className="text-sm text-purple-700">{appAiSuggestion.reasoning}</p>
                  <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100" onClick={() => setAppLinkingTo(appAiSuggestion.badge_id)}>
                    Use: {appAiSuggestion.badge_name}
                  </Button>
                </div>
              )}
              <div>
                <Label>Link to OSM badge</Label>
                <Select value={appLinkingTo || '__none__'} onValueChange={v => setAppLinkingTo(v === '__none__' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select an OSM badge..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No link —</SelectItem>
                    {[...osmBadges].sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name} ({b.badge_type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAppLinkDialog(null); setAppLinkingTo(''); setAppAiSuggestion(null); }}>Cancel</Button>
              <Button onClick={handleSaveAppLink} className="bg-[#7413dc] hover:bg-[#5c0fb0]">Save Link</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>}

      {/* ── Programme Sync ── */}
      {activePanel === 'programme-sync' && <OSMProgrammeSyncPanel />}

      {/* ── Member Sync ── */}
      {activePanel === 'member-sync' && <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Member OSM Linking</CardTitle>
            <CardDescription>Link member records with their OSM IDs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium">{member.full_name}</p>
                  <p className="text-xs text-gray-500">{sections.find(s => s.id === member.section_id)?.display_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {member.osm_scoutid
                    ? <><Badge className="bg-green-100 text-green-800">ID: {member.osm_scoutid}</Badge><CheckCircle className="w-5 h-5 text-green-600" /></>
                    : <><Badge className="bg-red-100 text-red-800">Not linked</Badge><XCircle className="w-5 h-5 text-red-600" /></>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>}
    </div>
  );
}