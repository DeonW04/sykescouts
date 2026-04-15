import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, Clock } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SectionSettingsTab({ sections, leaders, queryClient }) {
  const [saving, setSaving] = useState({});
  const [meetingEdits, setMeetingEdits] = useState({});

  const handleSetTeamLeader = async (sectionId, leaderId) => {
    setSaving(s => ({ ...s, [sectionId]: true }));
    try {
      await base44.entities.Section.update(sectionId, {
        team_leader_id: leaderId === '__none__' ? null : leaderId,
      });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast.success('Team leader updated');
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(s => ({ ...s, [sectionId]: false }));
    }
  };

  const getMeetingEdit = (section) => meetingEdits[section.id] ?? {
    meeting_day: section.meeting_day || '',
    meeting_start_time: section.meeting_start_time || '',
    meeting_end_time: section.meeting_end_time || '',
  };

  const setMeetingField = (sectionId, field, value) => {
    setMeetingEdits(prev => ({
      ...prev,
      [sectionId]: { ...getMeetingEdit({ id: sectionId, ...sections.find(s => s.id === sectionId) }), [field]: value },
    }));
  };

  const handleSaveMeetingTimes = async (sectionId) => {
    const edit = meetingEdits[sectionId];
    if (!edit) return;
    setSaving(s => ({ ...s, [`meet_${sectionId}`]: true }));
    try {
      await base44.entities.Section.update(sectionId, {
        meeting_day: edit.meeting_day,
        meeting_start_time: edit.meeting_start_time,
        meeting_end_time: edit.meeting_end_time,
      });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setMeetingEdits(prev => { const n = { ...prev }; delete n[sectionId]; return n; });
      toast.success('Meeting times saved');
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(s => ({ ...s, [`meet_${sectionId}`]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Team Leaders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Leaders
          </CardTitle>
          <p className="text-sm text-gray-500">Set the Team Leader for each section. Team leaders receive section-level notifications and have access to section accounting.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.length === 0 && <p className="text-sm text-gray-400">No active sections found.</p>}
          {sections.map(section => {
            const sectionLeaders = leaders.filter(l => l.section_ids?.includes(section.id));
            return (
              <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-semibold">{section.display_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{section.name} · {sectionLeaders.length} leader{sectionLeaders.length !== 1 ? 's' : ''} assigned</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500 mr-1">Team Leader:</div>
                  <Select
                    value={section.team_leader_id || '__none__'}
                    onValueChange={(val) => handleSetTeamLeader(section.id, val)}
                    disabled={saving[section.id]}
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Select leader..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {sectionLeaders.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>
                      ))}
                      {sectionLeaders.length === 0 && (
                        <SelectItem value="__no_leaders__" disabled>No leaders assigned to this section</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {saving[section.id] && <span className="text-xs text-gray-400">Saving...</span>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Meeting Day & Times per section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Meeting Day & Times
          </CardTitle>
          <p className="text-sm text-gray-500">Set each section's meeting day and usual start/end times. These are used when generating the weekly programme schedule.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(section => {
            const edit = getMeetingEdit(section);
            const isDirty = !!meetingEdits[section.id];
            return (
              <div key={section.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <p className="font-semibold text-sm">{section.display_name}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Meeting Day</Label>
                    <Select value={edit.meeting_day} onValueChange={v => setMeetingField(section.id, 'meeting_day', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select day..." /></SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input type="time" value={edit.meeting_start_time} onChange={e => setMeetingField(section.id, 'meeting_start_time', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input type="time" value={edit.meeting_end_time} onChange={e => setMeetingField(section.id, 'meeting_end_time', e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                {isDirty && (
                  <Button size="sm" onClick={() => handleSaveMeetingTimes(section.id)} disabled={saving[`meet_${section.id}`]} className="bg-[#004851] hover:bg-[#003840]">
                    {saving[`meet_${section.id}`] ? 'Saving...' : 'Save Meeting Times'}
                  </Button>
                )}
                {!isDirty && edit.meeting_day && (
                  <p className="text-xs text-gray-500">{edit.meeting_day}s, {edit.meeting_start_time}–{edit.meeting_end_time}</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}