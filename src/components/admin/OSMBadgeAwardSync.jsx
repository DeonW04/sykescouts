import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function OSMBadgeAwardSync() {
  const queryClient = useQueryClient();
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['osm-settings'],
    queryFn: async () => {
      const data = await base44.entities.OSMSyncSettings.filter({});
      if (data[0] && !settingsForm) {
        setSettingsForm({
          sync_frequency: data[0].sync_frequency || 'monthly',
          notification_emails: data[0].notification_emails || '',
          is_active: data[0].is_active !== false,
        });
      }
      return data;
    },
  });

  const { data: pendingSync = [], refetch: refetchPending } = useQuery({
    queryKey: ['pending-badge-sync'],
    queryFn: () => base44.entities.PendingBadgeSync.filter({}),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const settings = settingsArr[0];

  const setField = (k, v) => setSettingsForm(f => ({ ...f, [k]: v }));

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
      toast.success('Sync settings saved');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncBadgesToOSM', {});
      if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success(`Sync complete — ${res.data?.success_count || 0} succeeded, ${res.data?.fail_count || 0} failed`);
        refetchPending();
        queryClient.invalidateQueries({ queryKey: ['pending-badge-sync'] });
      }
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSync = async (id) => {
    try {
      await base44.entities.PendingBadgeSync.delete(id);
      refetchPending();
      toast.success('Record deleted');
    } catch (e) {
      toast.error('Delete failed: ' + e.message);
    }
  };

  const getBadgeName = (badgeId) => {
    const badge = badges.find(b => b.osm_id && b.osm_id.startsWith(String(badgeId)));
    return badge?.name || `Badge ID: ${badgeId}`;
  };

  const getMemberName = (scoutid) => {
    const member = members.find(m => m.osm_scoutid === scoutid);
    return member?.full_name || `Scout ID: ${scoutid}`;
  };

  const pendingRecords = pendingSync.filter(s => s.status === 'pending');
  const completedRecords = pendingSync.filter(s => s.status === 'completed');
  const failedRecords = pendingSync.filter(s => s.status === 'failed');

  return (
    <div className="space-y-6">
      {/* Manual Sync Trigger */}
      <Card className="border-[#7413dc]/30 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-[#7413dc]" />
            Manual Sync
          </CardTitle>
          <CardDescription>
            Trigger the badge award sync to OSM right now. Works exactly the same as the scheduled sync — use this to test.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4 flex-wrap">
          <Button
            onClick={handleManualSync}
            disabled={syncing}
            className="bg-[#7413dc] hover:bg-[#5c0fb0]"
          >
            {syncing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing to OSM...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />Run Sync Now</>
            )}
          </Button>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500" />{pendingRecords.length} pending</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" />{completedRecords.length} completed</span>
            <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" />{failedRecords.length} failed</span>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Sync Settings</CardTitle>
          <CardDescription>Configure how often badge awards are automatically synced to OSM</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsForm ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Sync Frequency</Label>
                  <Select value={settingsForm.sync_frequency} onValueChange={v => setField('sync_frequency', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                    className="mt-1"
                    value={settingsForm.notification_emails}
                    onChange={e => setField('notification_emails', e.target.value)}
                    placeholder="leader@scouts.org"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={settingsForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                <Label>Scheduled sync {settingsForm.is_active ? 'enabled' : 'disabled'}</Label>
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

      {/* Pending sync records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            All Pending Badge Sync Records
          </CardTitle>
          <CardDescription>Badge awards queued to be synced to OSM</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSync.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No pending sync records.</p>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-5 gap-3 px-3 py-2 bg-gray-100 rounded-lg font-semibold text-xs sticky top-0">
                <div>Member</div>
                <div>Badge ID</div>
                <div>Action</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {pendingSync.map(record => (
                <div key={record.id} className={`grid grid-cols-5 gap-3 px-3 py-2.5 border rounded-lg items-center text-sm ${record.status === 'failed' ? 'border-red-200 bg-red-50' : record.status === 'completed' ? 'border-green-200 bg-green-50' : 'hover:bg-gray-50'}`}>
                  <div className="font-medium">
                    {record.firstname} {record.lastname}
                    <div className="text-xs text-gray-400">Scout ID: {record.scoutid}</div>
                  </div>
                  <div className="text-xs font-mono text-gray-600">
                    {record.badge_id}
                    {record.badge_version != null && <span className="text-gray-400"> v{record.badge_version}</span>}
                  </div>
                  <div>
                    <Badge variant="outline" className={`text-xs ${record.action === 'award' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                      {record.action}
                    </Badge>
                  </div>
                  <div>
                    {record.status === 'pending' && <Badge className="bg-amber-100 text-amber-800 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>}
                    {record.status === 'completed' && <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>}
                    {record.status === 'failed' && (
                      <div>
                        <Badge className="bg-red-100 text-red-800 text-xs"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
                        {record.error && <p className="text-xs text-red-600 mt-0.5">{record.error}</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteSync(record.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}