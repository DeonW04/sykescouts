import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function OSMProgrammeSyncPanel() {
  const queryClient = useQueryClient();
  const [fetchingTerms, setFetchingTerms] = useState(false);
  const [osmTerms, setOsmTerms] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localOsmTermId, setLocalOsmTermId] = useState('');
  const [localAppTermId, setLocalAppTermId] = useState('');

  const { data: settingsArr = [] } = useQuery({ queryKey: ['osm-settings'], queryFn: () => base44.entities.OSMSyncSettings.filter({}) });
  const { data: appTerms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.filter({ active: true }) });

  const settings = settingsArr[0];

  // Initialise local state from settings once loaded
  React.useEffect(() => {
    if (settings) {
      setLocalOsmTermId(settings.osm_term_id || '');
      setLocalAppTermId(settings.linked_app_term_id || '');
    }
  }, [settings?.id]);

  const handleFetchTerms = async () => {
    setFetchingTerms(true);
    try {
      const res = await base44.functions.invoke('getOSMTerms', {});
      if (res.data.error) { toast.error(res.data.error); return; }
      setOsmTerms(res.data.terms || []);
    } catch (e) {
      toast.error('Failed to fetch OSM terms: ' + e.message);
    } finally {
      setFetchingTerms(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await base44.entities.OSMSyncSettings.update(settings.id, {
        osm_term_id: localOsmTermId || null,
        linked_app_term_id: localAppTermId || null,
      });
      queryClient.invalidateQueries({ queryKey: ['osm-settings'] });
      toast.success('Programme sync settings saved');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const sortedAppTerms = [...appTerms].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-purple-600" />
          Programme Sync Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* OSM Term Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-gray-700">OSM Term</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Currently saved: <span className="font-mono">{settings?.osm_term_id || 'Not set'}</span>
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleFetchTerms} disabled={fetchingTerms}>
              {fetchingTerms ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Fetching...</> : 'Fetch Terms from OSM'}
            </Button>
          </div>

          {osmTerms && (
            <Select value={localOsmTermId} onValueChange={setLocalOsmTermId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an OSM term..." />
              </SelectTrigger>
              <SelectContent>
                {osmTerms.map(t => (
                  <SelectItem key={t.termid} value={t.termid}>
                    {t.name} ({t.startdate} to {t.enddate})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* App Term Row */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Your App Term</p>
          <Select value={localAppTermId || '__none__'} onValueChange={v => setLocalAppTermId(v === '__none__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an app term..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Not selected —</SelectItem>
              {sortedAppTerms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title} ({t.start_date} to {t.end_date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info box */}
        <div className="p-3 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-600">
          The OSM term and your app term must cover the same date range for programme sync to work correctly.
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving...</> : <><Save className="w-3 h-3 mr-1" />Save</>}
        </Button>
      </CardContent>
    </Card>
  );
}