import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, MessageSquare, Link2, Users, MapPin, ChevronUp, ChevronDown, RefreshCw, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-100 text-red-700',
};

function toLocalInputValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function BlockEditor({ block, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const labels = { text: '📝 Text', volunteers: '🙋 Volunteer List', location_time: '📍 Location / Time Change' };
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600">{labels[block.type] || block.type}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onMoveUp} disabled={isFirst}><ChevronUp className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={onMoveDown} disabled={isLast}><ChevronDown className="w-3 h-3" /></Button>
          <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>
      {block.type === 'text' && (
        <Textarea value={block.content || ''} onChange={e => onUpdate({ content: e.target.value })} rows={3} placeholder="Message text... Use *bold* for WhatsApp formatting" className="text-sm" />
      )}
      {block.type === 'volunteers' && (
        <div className="space-y-2">
          <Input value={block.intro || ''} onChange={e => onUpdate({ intro: e.target.value })} placeholder="Heading (e.g. 🙋 *Thank you to this week's helpers:*)" className="text-sm" />
          <Input value={block.fallback_text || ''} onChange={e => onUpdate({ fallback_text: e.target.value })} placeholder="Text if no volunteers signed up (leave blank to hide)" className="text-sm" />
          <p className="text-xs text-gray-400">Parent names are auto-filled from volunteer responses at send time.</p>
        </div>
      )}
      {block.type === 'location_time' && (
        <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-2">This section appears automatically only if the meeting has an unusual location, time, or no-meeting notice. Nothing to configure.</p>
      )}
    </div>
  );
}

function MessagePreview({ blocks, isRa, raLink }) {
  const parts = isRa
    ? [`📋 *Risk Assessments – [Meeting Title]*\n\nPlease review before the session:\n🔗 ${raLink || 'https://yourapp.com/public-ra?...'}\n\n_No sign-in required_`]
    : (blocks || []).map(b => {
        if (b.type === 'text') return b.content?.trim() || '_[Empty text block]_';
        if (b.type === 'volunteers') return `${b.intro || '🙋 *Parent helpers this week:*'}\n• Jane Smith _(auto-filled)_\n• Sarah Jones _(auto-filled)_`;
        if (b.type === 'location_time') return `⚠️ *Change of Details:*\n📌 *Location:* [if changed]\n🕐 *Time:* [if changed]\n_(only shown if different from usual)_`;
        return '';
      }).filter(Boolean);

  return (
    <div className="bg-gray-900 text-green-300 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
      {parts.join('\n\n') || '_No content yet_'}
    </div>
  );
}

export default function WhatsAppScheduleManager({ meetingId, eventId, title = 'this session', startDateTime }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formType, setFormType] = useState(null);
  const [form, setForm] = useState({});
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);

  const loadTemplates = async () => {
    const all = await base44.entities.WhatsAppTemplate.filter({});
    setTemplates(all);
  };

  const loadMeetingInfo = async () => {
    if (meetingId) {
      const [meetings, sections] = await Promise.all([
        base44.entities.Programme.filter({ id: meetingId }),
        base44.entities.Section.filter({})
      ]);
      const mtg = meetings[0];
      if (mtg) {
        const sec = sections.find(s => s.id === mtg.section_id);
        setMeetingInfo({
          title: mtg.title || 'Meeting', date: mtg.date,
          startTime: mtg.optional_start_time || sec?.meeting_start_time || '18:00',
          section: sec?.display_name || '', location: mtg.optional_location || 'usual venue',
          endTime: mtg.optional_end_time || sec?.meeting_end_time || ''
        });
      }
    } else if (eventId) {
      const events = await base44.entities.Event.filter({ id: eventId });
      const evt = events[0];
      if (evt) {
        setMeetingInfo({
          title: evt.title || 'Event', date: evt.start_date?.split('T')[0] || '',
          startTime: evt.start_date?.split('T')[1]?.slice(0, 5) || '',
          section: '', location: evt.location || '', endTime: ''
        });
      }
    }
  };

  const calculateSendAt = (timing, info) => {
    if (!timing || !info?.date) return null;
    const fullStart = `${info.date}T${info.startTime || '18:00'}:00`;
    const start = new Date(fullStart);
    if (isNaN(start.getTime())) return null;
    if (timing.type === 'hours_before') return new Date(start.getTime() - (timing.hours || 1) * 3600000);
    const d = new Date(start);
    if (timing.type === 'day_before_at') d.setDate(d.getDate() - 1);
    else if (timing.type === 'days_before_at') d.setDate(d.getDate() - (timing.days || 1));
    else if (timing.type === 'week_before_on') {
      const back = ((d.getDay() - (timing.day ?? 0) + 7) % 7) || 7;
      d.setDate(d.getDate() - back);
    } else return null;
    const [h, m] = (timing.time || '18:00').split(':');
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d;
  };

  const fillPlaceholders = (text, info) => {
    if (!text || !info) return text || '';
    const dateStr = info.date ? moment(info.date).format('dddd Do MMMM') : '{{date}}';
    return text
      .replace(/{{title}}/g, info.title || '{{title}}')
      .replace(/{{date}}/g, dateStr)
      .replace(/{{section}}/g, info.section || '{{section}}')
      .replace(/{{start_time}}/g, info.startTime || '{{start_time}}')
      .replace(/{{end_time}}/g, info.endTime || '{{end_time}}')
      .replace(/{{location}}/g, info.location || 'usual venue');
  };

  const formatTiming = (timing) => {
    if (!timing) return 'Custom';
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    if (timing.type === 'hours_before') return `${timing.hours}h before meeting start`;
    if (timing.type === 'day_before_at') return `Day before at ${timing.time}`;
    if (timing.type === 'days_before_at') return `${timing.days} days before at ${timing.time}`;
    if (timing.type === 'week_before_on') return `${days[timing.day ?? 0]} before at ${timing.time}`;
    return 'Custom';
  };

  const applyTemplate = (tmpl) => {
    const sendAtDate = calculateSendAt(tmpl.send_timing, meetingInfo);
    const sendAtLocal = sendAtDate
      ? new Date(sendAtDate.getTime() - sendAtDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : '';
    const blocks = tmpl.schedule_type === 'parent_reminder'
      ? (tmpl.message_blocks || []).map(b => ({
          ...b, id: crypto.randomUUID(),
          content: b.type === 'text' ? fillPlaceholders(b.content || '', meetingInfo) : b.content
        }))
      : [];
    setForm(f => ({
      ...f,
      send_at: sendAtLocal || f.send_at,
      ...(tmpl.schedule_type === 'parent_reminder' && { message_blocks: blocks })
    }));
    setShowTemplates(false);
  };

  const linkedField = meetingId ? 'linked_meeting_id' : 'linked_event_id';
  const linkedId = meetingId || eventId;
  const raUrl = linkedId ? `${window.location.origin}/public-ra?id=${linkedId}&type=${meetingId ? 'meeting' : 'event'}` : '';

  useEffect(() => { if (linkedId) loadSchedules(); }, [linkedId]);

  const loadSchedules = async () => {
    setLoading(true);
    const all = await base44.entities.WhatsAppSchedule.filter({ [linkedField]: linkedId });
    setSchedules(all.sort((a, b) => new Date(a.send_at) - new Date(b.send_at)));
    setLoading(false);
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    const res = await base44.functions.invoke('whatsappGetGroups', {});
    if (res.data?.groups) setGroups(res.data.groups);
    else toast.error('Could not load groups — check WhatsApp connection');
    setLoadingGroups(false);
  };

  const openForm = (type) => {
    setFormType(type);
    setForm(type === 'ra'
      ? { schedule_type: 'risk_assessment_leaders', target_group_jid: '', target_group_name: '', send_at: '', ra_link_url: raUrl }
      : { schedule_type: 'parent_reminder', target_group_jid: '', target_group_name: '', send_at: '', message_blocks: [{ id: crypto.randomUUID(), type: 'text', content: '' }] }
    );
    fetchGroups();
    loadTemplates();
    loadMeetingInfo();
    setOpen(true);
  };

  const handleGroupSelect = (jid) => {
    const g = groups.find(x => x.id === jid);
    setForm(f => ({ ...f, target_group_jid: jid, target_group_name: g?.name || '' }));
  };

  const updateBlock = (id, updates) => setForm(f => ({ ...f, message_blocks: f.message_blocks.map(b => b.id === id ? { ...b, ...updates } : b) }));
  const addBlock = (type) => setForm(f => ({ ...f, message_blocks: [...(f.message_blocks || []), { id: crypto.randomUUID(), type }] }));
  const removeBlock = (id) => setForm(f => ({ ...f, message_blocks: f.message_blocks.filter(b => b.id !== id) }));
  const moveBlock = (id, dir) => setForm(f => {
    const arr = [...f.message_blocks];
    const i = arr.findIndex(b => b.id === id);
    if (dir === 'up' && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (dir === 'down' && i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    return { ...f, message_blocks: arr };
  });

  const handleSave = async () => {
    if (!form.target_group_jid) { toast.error('Please select a WhatsApp group'); return; }
    if (!form.send_at) { toast.error('Please set a send date and time'); return; }
    setSaving(true);
    await base44.entities.WhatsAppSchedule.create({
      [linkedField]: linkedId,
      ...form,
      send_at: new Date(form.send_at).toISOString(),
      status: 'scheduled'
    });
    toast.success('Message scheduled!');
    setOpen(false);
    loadSchedules();
    setSaving(false);
  };

  const handleCancel = async (id) => {
    await base44.entities.WhatsAppSchedule.update(id, { status: 'cancelled' });
    setSchedules(s => s.map(x => x.id === id ? { ...x, status: 'cancelled' } : x));
    toast.success('Schedule cancelled');
  };

  // Quick time presets (only if startDateTime includes a time)
  const hasTime = startDateTime?.includes('T');
  const timePresets = hasTime ? [2, 4, 12, 24].map(h => {
    const t = new Date(new Date(startDateTime).getTime() - h * 3600000);
    return { label: `${h}h before (${moment(t).format('HH:mm')})`, value: toLocalInputValue(t.toISOString()) };
  }) : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#25D366]" />
            WhatsApp Schedules
          </CardTitle>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => openForm('ra')} className="text-xs h-7 px-2 gap-1">
              <Link2 className="w-3 h-3" /> RA Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => openForm('reminder')} className="text-xs h-7 px-2 gap-1">
              <Plus className="w-3 h-3" /> Reminder
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <p className="text-xs text-gray-400 py-2">Loading...</p>
        ) : schedules.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No scheduled messages. Add a risk assessment link or parent reminder above.</p>
        ) : (
          <div className="space-y-1.5">
            {schedules.map(s => (
              <div key={s.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {s.schedule_type === 'risk_assessment_leaders' ? '📋 RA Link' : '💬 Reminder'}
                    {' → '}{s.target_group_name || s.target_group_jid}
                  </p>
                  <p className="text-xs text-gray-400">{s.send_at ? moment(s.send_at).format('ddd D MMM, HH:mm') : '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <Badge className={`text-xs ${STATUS_COLORS[s.status] || ''}`}>{s.status}</Badge>
                  {s.status === 'scheduled' && (
                    <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400 hover:text-red-600" onClick={() => handleCancel(s.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Template Picker Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#7413dc]" /> Apply a Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto py-1">
            {templates.filter(t => t.schedule_type === form.schedule_type).map(tmpl => {
              const sendAtDate = calculateSendAt(tmpl.send_timing, meetingInfo);
              return (
                <button key={tmpl.id} type="button"
                  className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-[#7413dc] hover:bg-purple-50 transition-all"
                  onClick={() => applyTemplate(tmpl)}>
                  <p className="text-sm font-semibold text-gray-800">{tmpl.template_name}</p>
                  <p className="text-xs text-gray-500">{formatTiming(tmpl.send_timing)}</p>
                  {sendAtDate && meetingInfo ? (
                    <p className="text-xs text-[#7413dc] mt-0.5">→ Sends: {moment(sendAtDate).format('ddd D MMM [at] HH:mm')}</p>
                  ) : !meetingInfo && (
                    <p className="text-xs text-amber-600 mt-0.5">Open from meeting detail to see calculated time</p>
                  )}
                </button>
              );
            })}
          </div>
          <div className="pt-1">
            <Link to="/WhatsAppTemplates" className="text-xs text-gray-400 hover:text-[#7413dc]">Manage templates →</Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {formType === 'ra' ? '📋 Schedule Risk Assessment Link' : '💬 Schedule Parent Reminder'}
              <span className="text-gray-400 font-normal text-sm ml-2">— {title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Template Picker */}
            {templates.filter(t => t.schedule_type === form.schedule_type).length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-[#7413dc] text-[#7413dc] rounded-lg py-2 text-xs font-medium hover:bg-purple-50 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" /> Apply a Template
              </button>
            )}

            {/* Group */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">WhatsApp Group</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={fetchGroups} disabled={loadingGroups}>
                  <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                  {loadingGroups ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              {groups.length > 0 ? (
                <Select value={form.target_group_jid} onValueChange={handleGroupSelect}>
                  <SelectTrigger><SelectValue placeholder="Select group..." /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.participant_count} members)</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Group JID (e.g. 447700123456-1234567890@g.us)" value={form.target_group_jid} onChange={e => setForm(f => ({ ...f, target_group_jid: e.target.value }))} className="text-sm" />
              )}
            </div>

            {/* Send time */}
            <div className="space-y-1.5">
              <Label className="text-sm">Send At</Label>
              {timePresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {timePresets.map(p => (
                    <Button key={p.value} size="sm" variant={form.send_at === p.value ? 'default' : 'outline'} className={`text-xs h-7 ${form.send_at === p.value ? 'bg-[#7413dc]' : ''}`}
                      onClick={() => setForm(f => ({ ...f, send_at: p.value }))}>
                      {p.label}
                    </Button>
                  ))}
                </div>
              )}
              <Input type="datetime-local" value={form.send_at || ''} onChange={e => setForm(f => ({ ...f, send_at: e.target.value }))} />
            </div>

            {/* RA Link display */}
            {formType === 'ra' && (
              <div className="space-y-1.5">
                <Label className="text-sm">Public Link (included in message)</Label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono break-all text-slate-600">{form.ra_link_url}</div>
                <p className="text-xs text-gray-400">No sign-in required. Anyone with the link can view the risk assessments.</p>
              </div>
            )}

            {/* Block builder */}
            {formType === 'reminder' && (
              <div className="space-y-2">
                <Label className="text-sm">Message Blocks</Label>
                {(form.message_blocks || []).map((block, i) => (
                  <BlockEditor key={block.id} block={block}
                    onUpdate={u => updateBlock(block.id, u)}
                    onDelete={() => removeBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, 'up')}
                    onMoveDown={() => moveBlock(block.id, 'down')}
                    isFirst={i === 0} isLast={i === (form.message_blocks?.length || 0) - 1}
                  />
                ))}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => addBlock('text')}><Plus className="w-3 h-3" /> Text</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => addBlock('volunteers')}><Users className="w-3 h-3" /> Volunteers</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => addBlock('location_time')}><MapPin className="w-3 h-3" /> Location/Time</Button>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5 font-medium">Preview</p>
                  <MessagePreview blocks={form.message_blocks} isRa={false} />
                </div>
              </div>
            )}

            {formType === 'ra' && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Preview</p>
                <MessagePreview isRa={true} raLink={form.ra_link_url} />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
              {saving ? 'Saving...' : 'Schedule Message'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}