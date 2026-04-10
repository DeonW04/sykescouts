import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RefreshCw, Loader2, Info, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  synced: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};
const ACTION_STYLES = {
  complete: 'bg-blue-100 text-blue-700',
  award: 'bg-purple-100 text-purple-700',
};

function EditSyncRecordDialog({ record, open, onOpenChange, onSave }) {
  const [form, setForm] = useState({ badge_id: '', level: 1, action: 'complete' });
  React.useEffect(() => {
    if (record && open) setForm({ badge_id: record.badge_id, level: record.level || 1, action: record.action });
  }, [record, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Sync Record</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Badge ID</Label>
            <Input type="number" value={form.badge_id} onChange={e => setForm(f => ({ ...f, badge_id: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Level</Label>
            <Input type="number" value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Action</Label>
            <Select value={form.action} onValueChange={v => setForm(f => ({ ...f, action: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="award">Award</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-gray-500">Saving will also reset status back to "pending".</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave({ ...form, status: 'pending' })} className="bg-[#004851] hover:bg-[#003840]">Save & Re-queue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OSMSyncPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clearSyncedConfirm, setClearSyncedConfirm] = useState(false);
  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['osm-settings'],
    queryFn: () => base44.entities.OSMSyncSettings.filter({}),
  });
  });

  const settings = settingsArr[0];
  React.useEffect(() => {
    if (settings && !settingsForm) setSettingsForm({ ...settings });
  }, [settings]);

  const { data: syncRecords = [] } = useQuery({
    queryKey: ['pending-badge-sync'],
    queryFn: () => base44.entities.PendingBadgeSync.list('-added_date', 200),
  });

  const counts = { all: syncRecords.length, pending: syncRecords.filter(r => r.status === 'pending').length, synced: syncRecords.filter(r => r.status === 'synced').length, failed: syncRecords.filter(r => r.status === 'failed').length };
  const filtered = statusFilter === 'all' ? syncRecords : syncRecords.filter(r => r.status === 'status' || r.status === statusFilter);

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
        setSyncResult({ ok: true, message: `Sync complete. Synced: ${res.data.synced}, Failed: ${res.data.failed}. Check your email for the full report.` });
        queryClient.invalidateQueries({ queryKey: ['pending-badge-sync'] });
        queryClient.invalidateQueries({ queryKey: ['osm-settings'] });
      }
    } catch (e) {
      setSyncResult({ ok: false, message: e.message });
    } finally {
      setSyncing(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PendingBadgeSync.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pending-badge-sync'] }); setEditRecord(null); toast.success('Record updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingBadgeSync.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pending-badge-sync'] }); setDeleteConfirm(null); toast.success('Record deleted'); },
  });

  const clearSyncedMutation = useMutation({
    mutationFn: async () => {
      const synced = syncRecords.filter(r => r.status === 'synced');
      for (const r of synced) await base44.entities.PendingBadgeSync.delete(r.id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pending-badge-sync'] }); setClearSyncedConfirm(false); toast.success('Cleared all synced records'); },
  });

  const setField = (k, v) => setSettingsForm(f => ({ ...f, [k]: v }));
  const filteredRecords = statusFilter === 'all' ? syncRecords : syncRecords.filter(r => r.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Panel 1 — Configuration */}
      <Card>
        <CardHeader><CardTitle>OSM Sync Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {settingsForm && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Sync Frequency</Label>
                  <Select value={settingsForm.sync_frequency || 'monthly'} onValueChange={v => setField('sync_frequency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>OSM Section ID</Label>
                  <Input type="number" value={settingsForm.osm_section_id || ''} onChange={e => setField('osm_section_id', Number(e.target.value))} placeholder="e.g. 12345" />
                </div>
                <div>
                  <Label>OSM Section Type</Label>
                  <Input value={settingsForm.osm_section || ''} onChange={e => setField('osm_section', e.target.value)} placeholder="e.g. scouts" />
                </div>
                <div>
                  <Label>Notification Emails</Label>
                  <Input value={settingsForm.notification_emails || ''} onChange={e => setField('notification_emails', e.target.value)} placeholder="leader@scouts.org, another@scouts.org" />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple addresses with a comma</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!settingsForm.is_active} onCheckedChange={v => setField('is_active', v)} />
                <Label className="cursor-pointer">Scheduled sync active {settingsForm.is_active ? '(on)' : '(off — sync will not run automatically)'}</Label>
              </div>
              {settings?.last_synced && (
                <p className="text-sm text-gray-500">Last synced: {format(new Date(settings.last_synced), 'd MMM yyyy, HH:mm')}</p>
              )}
              {!settings?.last_synced && <p className="text-sm text-gray-500">Last synced: Never</p>}
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-[#004851] hover:bg-[#003840]">
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>

              {/* Secrets reminder */}
              <div className="flex gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                <div>
                  <p className="font-semibold mb-1">Required Secrets</p>
                  <p>Before this sync will work, you must add the following four secrets in <strong>Dashboard → Settings → Secrets</strong>: <code className="bg-gray-100 px-1 rounded">OSM_API_ID</code>, <code className="bg-gray-100 px-1 rounded">OSM_TOKEN</code>, <code className="bg-gray-100 px-1 rounded">OSM_USERID</code>, <code className="bg-gray-100 px-1 rounded">OSM_SECRET</code>. Your <code className="bg-gray-100 px-1 rounded">OSM_API_ID</code> and <code className="bg-gray-100 px-1 rounded">OSM_TOKEN</code> come from your OSM OAuth client credentials. To get <code className="bg-gray-100 px-1 rounded">OSM_USERID</code> and <code className="bg-gray-100 px-1 rounded">OSM_SECRET</code>, make a one-time POST to <code className="bg-gray-100 px-1 rounded text-xs">https://www.onlinescoutmanager.co.uk/users.php?action=authorise</code> with your apiid, token, email and password — the response contains the userid and secret values to store.</p>
                </div>
              </div>
            </>
          )}
          {!settingsForm && <p className="text-sm text-gray-500">Loading settings...</p>}
        </CardContent>
      </Card>

      {/* Panel 2 — Manual Sync */}
      <Card>
        <CardHeader><CardTitle>Manual Sync</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSyncNow} disabled={syncing} className="bg-[#7413dc] hover:bg-[#5c0fb0] min-w-[160px]">
            {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing with OSM...</> : <><RefreshCw className="w-4 h-4 mr-2" />Sync Now</>}
          </Button>
          {syncResult && (
            <div className={`p-3 rounded-lg text-sm ${syncResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {syncResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel 3 — Pending Records */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Badge Sync Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {[['all', 'All'], ['pending', 'Pending'], ['synced', 'Synced'], ['failed', 'Failed']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${statusFilter === key ? 'bg-[#004851] text-white border-[#004851]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === key ? 'bg-white/20' : 'bg-gray-100'}`}>{counts[key]}</span>
              </button>
            ))}
            <div className="ml-auto">
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setClearSyncedConfirm(true)} disabled={counts.synced === 0}>
                Clear All Synced ({counts.synced})
              </Button>
            </div>
          </div>

          {/* Table */}
          {filteredRecords.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No records</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-semibold">Member</th>
                    <th className="p-2 font-semibold">Badge ID</th>
                    <th className="p-2 font-semibold">Action</th>
                    <th className="p-2 font-semibold">Status</th>
                    <th className="p-2 font-semibold">Added</th>
                    <th className="p-2 font-semibold">Synced</th>
                    <th className="p-2 font-semibold">Error</th>
                    <th className="p-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{r.firstname} {r.lastname}</td>
                      <td className="p-2">{r.badge_id}</td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ACTION_STYLES[r.action] || 'bg-gray-100 text-gray-700'}`}>{r.action}</span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[r.status] || 'bg-gray-100'}`}>{r.status}</span>
                      </td>
                      <td className="p-2 text-gray-500">{r.added_date ? format(new Date(r.added_date), 'd MMM yy') : '—'}</td>
                      <td className="p-2 text-gray-500">{r.synced_date ? format(new Date(r.synced_date), 'd MMM yy') : '—'}</td>
                      <td className="p-2 max-w-xs">
                        {r.status === 'failed' && r.error_notes ? (
                          <span title={r.error_notes} className="text-red-600 cursor-help text-xs">
                            {r.error_notes.slice(0, 80)}{r.error_notes.length > 80 ? '…' : ''}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditRecord(r)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteConfirm(r)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditSyncRecordDialog
        record={editRecord}
        open={!!editRecord}
        onOpenChange={(o) => !o && setEditRecord(null)}
        onSave={(data) => updateMutation.mutate({ id: editRecord.id, data })}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Record</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-700">Delete the sync record for <strong>{deleteConfirm?.firstname} {deleteConfirm?.lastname}</strong> (Badge {deleteConfirm?.badge_id})?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear synced confirm */}
      <Dialog open={clearSyncedConfirm} onOpenChange={setClearSyncedConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clear Synced Records</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-700">This will permanently delete all {counts.synced} synced records. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearSyncedConfirm(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => clearSyncedMutation.mutate()}>Clear All Synced</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}