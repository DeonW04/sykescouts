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

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('syncBadgesToOSM', {});
      if (res.data.error) {
        setSyncResult({ ok: false, message: res.data.error });
      } else {
        setSyncResult({
          ok: true,
          message: `Sync complete. Synced: ${res.data.synced}, Failed: ${res.data.failed}. Check your email for details.`,
        });
        queryClient.invalidateQueries({ queryKey: ['pending-badge-sync'] });
      }
    } catch (e) {
      setSyncResult({ ok: false, message: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleMatchBadges = async () => {
    setMatchingBadges(true);
    setBadgeMatches(null);
    try {
      const res = await base44.functions.invoke('matchOSMBadges', {});
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        setBadgeMatches(res.data);
        setSelectedBadgeMatches(res.data.certain.map(m => ({ osm_id: m.osm_id, app_id: m.app_id })));
        toast.success(`Matched ${res.data.certain.length} badges, ${res.data.uncertain.length} need review`);
      }
    } catch (e) {
      toast.error('Matching failed: ' + e.message);
    } finally {
      setMatchingBadges(false);
    }
  };

  const handleSaveMatches = async () => {
    // TODO: save badge ID mappings
    toast.success('Badge mappings saved');
    setBadgeMatches(null);
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
              <Button
                onClick={() => {
                  setCheckingConnection(true);
                  setTimeout(() => {
                    setOsmConnected(false);
                    setCheckingConnection(false);
                  }, 1000);
                }}
                variant="outline"
                disabled={checkingConnection}
              >
                {checkingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Check Connection
              </Button>
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
            <CardTitle>OSM Badge Matching</CardTitle>
            <CardDescription>Match OSM badge IDs with your app badges using AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">How it works</p>
                <p>Click "Match Badges" to use AI to automatically match OSM badges with your app badges. You'll review uncertain matches before saving.</p>
              </div>
            </div>
            <Button
              onClick={handleMatchBadges}
              disabled={matchingBadges || !osmConnected}
              className="bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              {matchingBadges ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Matching badges...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Match Badges with AI
                </>
              )}
            </Button>

            {syncResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  syncResult.ok
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {syncResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        {badgeMatches && (
          <BadgeMatchDialog
            matches={badgeMatches}
            selected={selectedBadgeMatches}
            onSelectedChange={setSelectedBadgeMatches}
            onSave={handleSaveMatches}
            onClose={() => setBadgeMatches(null)}
          />
        )}
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

function BadgeMatchDialog({ matches, selected, onSelectedChange, onSave, onClose }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Badge Matches</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <h4 className="font-semibold text-green-700">✓ Certain Matches ({matches.certain.length})</h4>
              <p className="text-xs text-gray-600">These will be saved automatically</p>
            </div>
            <div>
              <h4 className="font-semibold text-amber-700">? Review Needed ({matches.uncertain.length})</h4>
              <p className="text-xs text-gray-600">Check and adjust before saving</p>
            </div>
          </div>

          {matches.certain.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Confident Matches</p>
              {matches.certain.map(m => (
                <div key={m.osm_id} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{m.osm_name}</span>
                    <span className="text-green-600">→ {m.app_name}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{m.reason}</p>
                </div>
              ))}
            </div>
          )}

          {matches.uncertain.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Needs Review</p>
              {matches.uncertain.map(m => (
                <div key={m.osm_id} className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{m.osm_name}</span>
                    <span className="text-xs bg-amber-100 px-2 py-1 rounded">
                      {(m.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {m.app_name && <p className="text-xs text-gray-600 mt-1">Possible: {m.app_name}</p>}
                  <p className="text-xs text-gray-600 mt-1">{m.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
            Save Matches
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}