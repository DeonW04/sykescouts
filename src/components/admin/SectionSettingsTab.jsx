import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Clock, ToggleLeft, RefreshCw } from 'lucide-react';
import OSMSectionPicker from './OSMSectionPicker';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SECTION_ORDER = ['squirrels', 'beavers', 'cubs', 'scouts', 'explorers'];

export default function SectionSettingsTab({ sections, leaders, queryClient }) {
  const [saving, setSaving] = useState({});
  const [meetingEdits, setMeetingEdits] = useState({});
  const [osmEdits, setOsmEdits] = useState({});
  const [osmTermsBySection, setOsmTermsBySection] = useState({});
  const [osmTermsLoading, setOsmTermsLoading] = useState({});

  // Sort sections by canonical order
  const sortedSections = [...sections].sort(
    (a, b) => SECTION_ORDER.indexOf(a.name) - SECTION_ORDER.indexOf(b.name)
  );

  const handleToggleActive = async (sectionId, currentActive) => {
    setSaving(s => ({ ...s, [`toggle_${sectionId}`]: true }));
    try {
      await base44.entities.Section.update(sectionId, { active: !currentActive });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['all-sections-admin'] });
      toast.success(`Section ${currentActive ? 'disabled' : 'enabled'}`);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(s => ({ ...s, [`toggle_${sectionId}`]: false }));
    }
  };

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

  const fetchOSMTerms = async (sectionId, osmSectionId) => {
    if (!osmSectionId) return;
    setOsmTermsLoading(t => ({ ...t, [sectionId]: true }));
    try {
      const res = await base44.functions.invoke('getOSMTerms', { osm_section_id_override: osmSectionId });
      const terms = res?.data?.terms || [];
      setOsmTermsBySection(t => ({ ...t, [sectionId]: terms }));
      if (terms.length === 0) toast.error('No terms returned from OSM for this section.');
    } catch (e) {
      toast.error('Could not fetch terms: ' + e.message);
    } finally {
      setOsmTermsLoading(t => ({ ...t, [sectionId]: false }));
    }
  };

  const setOsmField = (sectionId, field, value) => {
    setOsmEdits(prev => {
      const s = sections.find(sec => sec.id === sectionId);
      const current = prev[sectionId] ?? {
        osm_section_id: s?.osm_section_id || '',
        osm_section_type: s?.osm_section_type || s?.name || '',
        osm_term_id: s?.osm_term_id || '',
      };
      return { ...prev, [sectionId]: { ...current, [field]: value } };
    });
  };

  const handleSaveOSM = async (sectionId) => {
    const edit = osmEdits[sectionId];
    if (!edit) return;
    setSaving(s => ({ ...s, [`osm_${sectionId}`]: true }));
    try {
      await base44.entities.Section.update(sectionId, {
        osm_section_id: edit.osm_section_id || null,
        osm_section_type: edit.osm_section_type || null,
        osm_term_id: edit.osm_term_id || null,
      });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['all-sections-admin'] });
      setOsmEdits(prev => { const n = { ...prev }; delete n[sectionId]; return n; });
      toast.success('OSM settings saved');
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(s => ({ ...s, [`osm_${sectionId}`]: false })); }
  };

  return (
    <div className="space-y-4">
      {/* Enable / Disable Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ToggleLeft className="w-5 h-5" />Active Sections</CardTitle>
          <p className="text-sm text-gray-500">Disable sections you're not using. Disabled sections are hidden from the leader portal and parent portal, but still appear on the public website.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedSections.map(section => (
            <div key={section.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold capitalize">{section.display_name}</p>
                  <Badge className={section.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}>
                    {section.active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 capitalize">{section.name}</p>
              </div>
              <Switch
                checked={!!section.active}
                onCheckedChange={() => handleToggleActive(section.id, section.active)}
                disabled={saving[`toggle_${section.id}`]}
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
          {sortedSections.filter(s => s.active).length === 0 && <p className="text-sm text-gray-400">No active sections found.</p>}
          {sortedSections.filter(s => s.active).map(section => {
            const sectionLeaders = leaders.filter(l => l.section_ids?.includes(section.id));
            return (
              <div key={section.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div>
                  <p className="font-semibold">{section.display_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{section.name} · {sectionLeaders.length} leader{sectionLeaders.length !== 1 ? 's' : ''} assigned</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex-shrink-0">Team Leader:</span>
                  <Select
                    value={section.team_leader_id || '__none__'}
                    onValueChange={(val) => handleSetTeamLeader(section.id, val)}
                    disabled={saving[section.id]}
                  >
                    <SelectTrigger className="flex-1">
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
                  {saving[section.id] && <span className="text-xs text-gray-400">Saving…</span>}
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
          {sortedSections.filter(s => s.active).map(section => {
            const edit = getMeetingEdit(section);
            const isDirty = !!meetingEdits[section.id];
            return (
              <div key={section.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <p className="font-semibold text-sm">{section.display_name}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* OSM Section Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" />OSM Section Mapping</CardTitle>
          <p className="text-sm text-gray-500">Link each section to its OSM section so badge syncing, member imports, and programme sync all use the correct OSM data per section.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedSections.filter(s => s.active).length === 0 && <p className="text-sm text-gray-400">No active sections found.</p>}
          {sortedSections.filter(s => s.active).map(section => {
            const edit = osmEdits[section.id] ?? {
              osm_section_id: section.osm_section_id || '',
              osm_section_type: section.osm_section_type || section.name || '',
              osm_term_id: section.osm_term_id || '',
            };
            const isDirty = !!osmEdits[section.id];
            return (
              <div key={section.id} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <p className="font-semibold text-sm">{section.display_name}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <Label className="text-xs">OSM Section</Label>
                    <OSMSectionPicker
                      value={edit.osm_section_id}
                      sectionType={edit.osm_section_type}
                      onChange={(sectionId, sectionType) => {
                        setOsmField(section.id, 'osm_section_id', sectionId);
                        if (sectionType) setOsmField(section.id, 'osm_section_type', sectionType);
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">OSM Section Type</Label>
                    <Select value={edit.osm_section_type || '__none__'} onValueChange={v => setOsmField(section.id, 'osm_section_type', v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="squirrels">Squirrels</SelectItem>
                        <SelectItem value="beavers">Beavers</SelectItem>
                        <SelectItem value="cubs">Cubs</SelectItem>
                        <SelectItem value="scouts">Scouts</SelectItem>
                        <SelectItem value="explorers">Explorers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Active OSM Term</Label>
                    <div className="flex gap-2 items-center">
                      {osmTermsBySection[section.id]?.length > 0 ? (
                        <Select
                          value={edit.osm_term_id || '__none__'}
                          onValueChange={v => setOsmField(section.id, 'osm_term_id', v === '__none__' ? '' : v)}
                        >
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue placeholder="Select term…" />
                          </SelectTrigger>
                          <SelectContent>
                            {osmTermsBySection[section.id].map(t => (
                              <SelectItem key={t.termid} value={t.termid}>
                                {t.name} ({t.startdate})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={edit.osm_term_id}
                          onChange={e => setOsmField(section.id, 'osm_term_id', e.target.value)}
                          placeholder="Enter ID or fetch below…"
                          className="h-8 text-sm flex-1"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs flex-shrink-0"
                        disabled={osmTermsLoading[section.id] || !edit.osm_section_id}
                        onClick={() => fetchOSMTerms(section.id, edit.osm_section_id)}
                      >
                        {osmTermsLoading[section.id] ? '…' : 'Fetch terms'}
                      </Button>
                    </div>
                  </div>
                </div>
                {isDirty && (
                  <Button size="sm" onClick={() => handleSaveOSM(section.id)} disabled={saving[`osm_${section.id}`]} className="bg-[#004851] hover:bg-[#003840]">
                    {saving[`osm_${section.id}`] ? 'Saving...' : 'Save OSM Settings'}
                  </Button>
                )}
                {!isDirty && edit.osm_section_id && (
                  <p className="text-xs text-green-600">✓ Linked: OSM ID {edit.osm_section_id} ({edit.osm_section_type}){edit.osm_term_id ? ` · Term ${edit.osm_term_id}` : ''}</p>
                )}
                {!isDirty && !edit.osm_section_id && (
                  <p className="text-xs text-amber-600">⚠ No OSM section linked yet</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}