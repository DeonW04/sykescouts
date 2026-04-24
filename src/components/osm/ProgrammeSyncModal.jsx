import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { toast } from 'sonner';

function ActionControl({ value, onChange }) {
  const opts = [
    { val: 'use_osm', label: 'Use OSM', IconComp: ArrowDown },
    { val: 'skip', label: 'Skip', IconComp: Minus },
    { val: 'use_app', label: 'Use App', IconComp: ArrowUp },
  ];
  return (
    <div className="flex items-center bg-gray-100 rounded-md overflow-hidden border border-gray-200">
      {opts.map(({ val, label, IconComp }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium transition-colors ${
            value === val
              ? val === 'use_osm' ? 'bg-blue-600 text-white' : val === 'use_app' ? 'bg-green-600 text-white' : 'bg-gray-500 text-white'
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <IconComp className="w-3 h-3" />
          {label}
        </button>
      ))}
    </div>
  );
}

function MeetingCell({ data, side, diffFields }) {
  if (!data) {
    return <div className="text-xs italic text-gray-400">{side === 'osm' ? 'No meeting in OSM' : 'No meeting in app'}</div>;
  }
  return (
    <div className="space-y-0.5">
      <p className={`font-semibold text-sm ${diffFields.has('title') ? 'text-amber-700 bg-amber-50 px-1 rounded' : ''}`}>
        {side === 'osm' ? data.title : (data.no_meeting ? (data.no_meeting_reason || 'No Meeting') : data.title)}
      </p>
      {(data.starttime || data.optional_start_time) && (
        <p className={`text-xs text-gray-500 ${diffFields.has('time') ? 'text-amber-700 bg-amber-50 px-1 rounded' : ''}`}>
          {side === 'osm' ? data.starttime : data.optional_start_time}
          {(side === 'osm' ? data.endtime : data.optional_end_time) && ` – ${side === 'osm' ? data.endtime : data.optional_end_time}`}
        </p>
      )}
    </div>
  );
}

export default function ProgrammeSyncModal({ open, onClose, termName, osmTermId, appTermId, sectionId, onSyncComplete }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [actions, setActions] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) { setRows([]); setActions({}); setResult(null); setError(''); return; }
    if (!osmTermId || !appTermId) return;
    loadData();
  }, [open, osmTermId, appTermId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [osmRes, appProgrammes] = await Promise.all([
        base44.functions.invoke('getOSMProgrammeSummary', {}),
        base44.entities.Programme.filter({ section_id: sectionId }),
      ]);

      if (osmRes.data.error) throw new Error(osmRes.data.error);

      const osmItems = osmRes.data.items || [];
      const appItems = appProgrammes.filter(p => {
        // Filter to linked term only (approx by checking if there are records)
        return true;
      });

      // Build combined date set
      const dateSet = new Set();
      osmItems.forEach(o => o.meetingdate && dateSet.add(o.meetingdate));
      appItems.forEach(a => a.date && dateSet.add(a.date));

      const sortedDates = [...dateSet].sort();
      const built = [];
      const initActions = {};

      for (const date of sortedDates) {
        const osmItem = osmItems.find(o => o.meetingdate === date);
        const appItem = appItems.find(a => a.date === date);
        const linked = osmItem && appItem && appItem.osm_evening_id && String(appItem.osm_evening_id) === String(osmItem.eveningid);

        let defaultAction = 'skip';
        if (osmItem && !appItem) defaultAction = 'use_osm';
        else if (!osmItem && appItem) defaultAction = 'use_app';

        built.push({ date, osmItem, appItem, linked });
        initActions[date] = defaultAction;
      }

      setRows(built);
      setActions(initActions);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getDiffFields = (osmItem, appItem) => {
    const diffs = new Set();
    if (!osmItem || !appItem) return diffs;
    const osmTitle = osmItem.title || '';
    const appTitle = appItem.no_meeting ? (appItem.no_meeting_reason || 'No Meeting') : (appItem.title || '');
    if (osmTitle !== appTitle) diffs.add('title');
    const osmStart = osmItem.starttime || '';
    const appStart = appItem.optional_start_time || '';
    if (osmStart !== appStart) diffs.add('time');
    return diffs;
  };

  const summary = useMemo(() => {
    let pullOSM = 0, pushApp = 0, skip = 0;
    Object.values(actions).forEach(a => {
      if (a === 'use_osm') pullOSM++;
      else if (a === 'use_app') pushApp++;
      else skip++;
    });
    return { pullOSM, pushApp, skip };
  }, [actions]);

  const handleApply = async () => {
    setSyncing(true);
    try {
      const selections = rows.map(row => ({
        action: actions[row.date] || 'skip',
        local_id: row.appItem?.id || null,
        osm_evening_id: row.osmItem ? String(row.osmItem.eveningid) : null,
        date: row.date,
        osm_item: row.osmItem || null,
        section_id: sectionId,
      }));
      const res = await base44.functions.invoke('bulkSyncProgramme', { selections });
      if (res.data.error) throw new Error(res.data.error);
      setResult(res.data);
      onSyncComplete?.();
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const setAllActions = (action) => {
    const next = {};
    rows.forEach(r => { next[r.date] = action; });
    setActions(next);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Programme Sync — {termName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Fetching programmes from both systems...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Sync Complete</h3>
              <div className="space-y-2">
                {result.created > 0 && <div className="flex items-center gap-2 text-green-700"><CheckCircle className="w-4 h-4" /> {result.created} meeting{result.created !== 1 ? 's' : ''} created in your app</div>}
                {result.updated > 0 && <div className="flex items-center gap-2 text-green-700"><CheckCircle className="w-4 h-4" /> {result.updated} meeting{result.updated !== 1 ? 's' : ''} pulled from OSM</div>}
                {result.pushed > 0 && <div className="flex items-center gap-2 text-green-700"><CheckCircle className="w-4 h-4" /> {result.pushed} meeting{result.pushed !== 1 ? 's' : ''} pushed to OSM</div>}
                {result.skipped > 0 && <div className="flex items-center gap-2 text-gray-500"><Minus className="w-4 h-4" /> {result.skipped} skipped</div>}
                {result.failed?.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 mb-2">Failed ({result.failed.length}):</p>
                    {result.failed.map((f, i) => <p key={i} className="text-xs text-red-600">{f.date}: {f.reason}</p>)}
                  </div>
                )}
              </div>
              <Button onClick={onClose}>Close</Button>
            </div>
          )}

          {!loading && !error && !result && rows.length > 0 && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border text-sm flex-wrap">
                <span className="text-blue-700 font-medium">{summary.pullOSM} to pull from OSM</span>
                <span className="text-green-700 font-medium">{summary.pushApp} to push to OSM</span>
                <span className="text-gray-500 font-medium">{summary.skip} to skip</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium w-28">Date</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">OSM</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Your App</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-medium w-44">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const diffs = getDiffFields(row.osmItem, row.appItem);
                      const hasDiffs = diffs.size > 0;
                      return (
                        <tr key={row.date} className={`border-b ${hasDiffs ? 'bg-amber-50/40' : 'hover:bg-gray-50'}`}>
                          <td className="py-2.5 px-3 align-top">
                            <div className="text-xs font-mono text-gray-600">{row.date}</div>
                            {row.linked && <Badge className="bg-green-600 text-white text-xs mt-1">Linked</Badge>}
                            {hasDiffs && <span className="text-amber-600 text-xs mt-1 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />Differs</span>}
                          </td>
                          <td className="py-2.5 px-3 align-top">
                            <MeetingCell data={row.osmItem} side="osm" diffFields={diffs} />
                          </td>
                          <td className="py-2.5 px-3 align-top">
                            <MeetingCell data={row.appItem} side="app" diffFields={diffs} />
                          </td>
                          <td className="py-2.5 px-3 align-top text-center">
                            <ActionControl value={actions[row.date] || 'skip'} onChange={v => setActions(prev => ({ ...prev, [row.date]: v }))} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && !result && rows.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAllActions('use_osm')}>Set all: Use OSM</Button>
              <Button size="sm" variant="outline" onClick={() => setAllActions('skip')}>Set all: Skip</Button>
              <Button size="sm" variant="outline" onClick={() => setAllActions('use_app')}>Set all: Use App</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleApply} disabled={syncing} className="bg-[#004851] hover:bg-[#003840] text-white">
                {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</> : 'Apply Changes'}
              </Button>
            </div>
          </div>
        )}

        {!loading && !result && rows.length === 0 && !error && (
          <div className="px-6 py-4 border-t flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}