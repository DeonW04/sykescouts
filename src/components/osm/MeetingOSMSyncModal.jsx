import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, X, Info } from 'lucide-react';
import { toast } from 'sonner';

function FieldRow({ label, osmVal, appVal }) {
  const match = (osmVal || '') === (appVal || '');
  return (
    <tr className={match ? '' : 'bg-amber-50'}>
      <td className="py-2 px-3 text-xs font-medium text-gray-500 w-36">{label}</td>
      <td className="py-2 px-3 text-sm">
        <span className={match ? 'text-gray-700' : 'text-amber-800 font-medium'}>{osmVal || <em className="text-gray-400">—</em>}</span>
      </td>
      <td className="py-2 px-3 text-sm">
        <span className={match ? 'text-gray-700' : 'text-amber-800 font-medium'}>{appVal || <em className="text-gray-400">—</em>}</span>
      </td>
      <td className="py-2 px-3 text-center w-8">
        {match
          ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
          : <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
      </td>
    </tr>
  );
}

export default function MeetingOSMSyncModal({ open, onClose, programme, onSynced }) {
  const [step, setStep] = useState('loading'); // loading | not_found | compare | pushing | pulling | confirm_pull | success_push | success_pull | error
  const [osmMeeting, setOsmMeeting] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmPull, setConfirmPull] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!open || !programme) return;
    setStep('loading');
    setOsmMeeting(null);
    setErrorMsg('');
    setConfirmPull(false);
    setSuccessMsg('');
    findOSMMeeting();
  }, [open, programme?.id]);

  const findOSMMeeting = async () => {
    try {
      if (programme.osm_evening_id) {
        // Direct lookup
        const res = await base44.functions.invoke('getOSMSingleMeeting', { eveningid: programme.osm_evening_id });
        if (res.data.error) throw new Error(res.data.error);
        if (!res.data.meeting) { setStep('not_found'); return; }
        setOsmMeeting(res.data.meeting);
        setStep('compare');
      } else {
        // Scan summary for matching date
        const res = await base44.functions.invoke('getOSMProgrammeSummary', {});
        if (res.data.error) throw new Error(res.data.error);
        const items = res.data.items || [];
        const match = items.find(i => i.meetingdate === programme.date);
        if (!match) { setStep('not_found'); return; }
        // Get full details
        const res2 = await base44.functions.invoke('getOSMSingleMeeting', { eveningid: String(match.eveningid) });
        if (res2.data.error || !res2.data.meeting) { setOsmMeeting(match); setStep('compare'); return; }
        setOsmMeeting(res2.data.meeting);
        setStep('compare');
      }
    } catch (e) {
      setErrorMsg(e.message);
      setStep('error');
    }
  };

  const handlePush = async () => {
    // If not yet linked, link first
    if (!programme.osm_evening_id && osmMeeting?.eveningid) {
      await base44.entities.Programme.update(programme.id, { osm_evening_id: String(osmMeeting.eveningid) });
    }
    setStep('pushing');
    try {
      const res = await base44.functions.invoke('pushMeetingToOSM', { programme_id: programme.id });
      if (res.data.error) throw new Error(res.data.error);
      setSuccessMsg('OSM updated successfully');
      setStep('success_push');
      onSynced?.();
    } catch (e) {
      setErrorMsg(e.message);
      setStep('error');
    }
  };

  const handlePull = async () => {
    if (!confirmPull) { setConfirmPull(true); return; }
    const eveningId = osmMeeting?.eveningid ? String(osmMeeting.eveningid) : programme.osm_evening_id;
    setStep('pulling');
    try {
      const res = await base44.functions.invoke('pullMeetingFromOSM', {
        osm_evening_id: eveningId,
        programme_id: programme.id,
      });
      if (res.data.error) throw new Error(res.data.error);
      setSuccessMsg('Meeting updated from OSM');
      setStep('success_pull');
      setTimeout(() => { onClose(); onSynced?.(); }, 2000);
    } catch (e) {
      setErrorMsg(e.message);
      setStep('error');
    }
  };

  const appTitle = programme?.no_meeting ? (programme.no_meeting_reason || 'No Meeting') : (programme?.title || '');
  const isNotLinked = !programme?.osm_evening_id;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'not_found' ? 'No OSM Meeting Found' :
             step === 'loading' ? 'Checking OSM...' :
             `OSM Sync — ${programme?.date}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading */}
          {step === 'loading' && (
            <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Checking OSM for this meeting...</span>
            </div>
          )}

          {/* Not found */}
          {step === 'not_found' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                OSM has no meeting recorded for <strong>{programme?.date}</strong> in the current term.
              </p>
              <p className="text-xs text-gray-500">
                If this meeting exists in OSM under a different date, use the full Programme Sync from the programme page to link it manually.
              </p>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}

          {/* Pushing / Pulling spinners */}
          {(step === 'pushing' || step === 'pulling') && (
            <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{step === 'pushing' ? 'Updating OSM...' : 'Pulling from OSM...'}</span>
            </div>
          )}

          {/* Success push */}
          {step === 'success_push' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" /> {successMsg}
              </div>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}

          {/* Success pull */}
          {step === 'success_pull' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" /> {successMsg} — closing...
            </div>
          )}

          {/* Comparison view */}
          {step === 'compare' && osmMeeting && (
            <>
              {/* Not linked banner */}
              {isNotLinked && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  This meeting is not yet linked to OSM. Confirming either action below will link it using OSM Evening ID <strong>{osmMeeting.eveningid}</strong>.
                </div>
              )}

              {/* Confirm pull banner */}
              {confirmPull && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <p className="font-semibold mb-1">Are you sure?</p>
                  <p>This will overwrite your meeting's title, description, and times with OSM data. Your activities, equipment, documents, and other settings will not be affected.</p>
                </div>
              )}

              {/* Comparison table */}
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 w-36">Field</th>
                    <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">OSM (Current)</th>
                    <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">Your Meeting</th>
                    <th className="py-2 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <FieldRow label="Title" osmVal={osmMeeting.title} appVal={appTitle} />
                  <FieldRow label="Notes for Parents" osmVal={osmMeeting.notesforparents} appVal={programme?.description} />
                  <FieldRow label="Start Time" osmVal={osmMeeting.starttime} appVal={programme?.optional_start_time || 'Section default'} />
                  <FieldRow label="End Time" osmVal={osmMeeting.endtime} appVal={programme?.optional_end_time || 'Section default'} />
                  <FieldRow label="OSM Evening ID" osmVal={String(osmMeeting.eveningid)} appVal={programme?.osm_evening_id || 'Not linked'} />
                </tbody>
              </table>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handlePush} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Update OSM with My Data
                </Button>
                <Button variant="outline" onClick={handlePull}>
                  {confirmPull ? 'Confirm: Pull OSM Data' : 'Pull OSM Data into My Meeting'}
                </Button>
                {confirmPull && (
                  <Button variant="ghost" onClick={() => setConfirmPull(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancel Pull
                  </Button>
                )}
                {!confirmPull && (
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}