import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import moment from 'moment';

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '44' + digits.slice(1);
  if (digits.startsWith('44')) return digits;
  return digits;
}

export function buildTestMessage(blocks, meeting, options, raUrl) {
  if (!blocks || blocks.length === 0) return '_No message blocks_';
  const origin = window.location.origin;
  const info = {
    title: meeting?.title || 'Cubs Meeting',
    date: meeting?.date ? moment(meeting.date).format('dddd Do MMMM') : 'Wednesday 25th June',
    section: meeting?.sectionName || meeting?.section || 'Cubs',
    start_time: meeting?.start_time || meeting?.optional_start_time || '18:30',
    end_time: meeting?.end_time || meeting?.optional_end_time || '20:00',
    location: meeting?.optional_location || meeting?.location || 'Scout HQ, Syke',
    description: meeting?.description || 'A fun packed evening with activities and games',
    gallery_link: `${origin}/Gallery`,
    upload_link: meeting?.id && meeting.id !== 'mock' ? `${origin}/GalleryUpload?meeting=${meeting.id}` : `${origin}/GalleryUpload?meeting=test`,
    cost: meeting?.cost ? `£${meeting.cost}` : 'Free',
    payment_deadline: meeting?.payment_deadline || '',
  };

  const parts = [];
  for (const block of (blocks || [])) {
    if (block.type === 'text') {
      let text = block.content || '';
      Object.entries(info).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || '');
      });
      if (text.trim()) parts.push(text.trim());
    } else if (block.type === 'volunteers') {
      if (options?.parent_volunteers) {
        const intro = block.intro || '🙋 *Parent helpers this week:*';
        parts.push(`${intro}\n• Jane Smith\n• Sarah Jones`);
      } else if (block.fallback_text?.trim()) {
        parts.push(block.fallback_text.trim());
      }
    } else if (block.type === 'location_time') {
      if (options?.unusual_place || options?.unusual_time) {
        const changeParts = ['⚠️ *Change of Details:*'];
        if (options.unusual_place) changeParts.push('📌 *Location:* Rochdale Town Hall, The Esplanade OL16 1AB');
        if (options.unusual_time) changeParts.push('🕐 *Time:* 19:00 – 20:30');
        parts.push(changeParts.join('\n'));
      }
    } else if (block.type === 'risk_assessments') {
      const url = raUrl || `${origin}/public-ra?id=test&type=meeting`;
      parts.push(`${block.intro || '📋 *Risk Assessments:*'}\n🔗 ${url}\n_No sign-in required_`);
    } else if (block.type === 'attendance') {
      const attending = ['Alice Brown', 'Bob Smith', 'Charlie Davis', 'Diana Evans'];
      const notAttending = ['Eve Wilson', 'Frank Green'];
      const heading = block.intro || '✅ *Attendance:*';
      parts.push(`${heading}\n✅ Attending (${attending.length}):\n${attending.map(n => `• ${n}`).join('\n')}\n\n❌ Not attending (${notAttending.length}):\n${notAttending.map(n => `• ${n}`).join('\n')}`);
    }
  }
  return parts.join('\n\n') || '_No content_';
}

export default function TestMessageDialog({ open, onClose, blocks, scheduleType, raUrl }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [leaderPhone, setLeaderPhone] = useState('');
  const [options, setOptions] = useState({ unusual_place: false, unusual_time: false, parent_volunteers: false });

  useEffect(() => { if (open) { setOptions({ unusual_place: false, unusual_time: false, parent_volunteers: false }); loadData(); } }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [user, allMeetings, sections] = await Promise.all([
        base44.auth.me(),
        base44.entities.Programme.filter({}, '-date', 50),
        base44.entities.Section.filter({})
      ]);
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      setLeaderPhone(leaders[0]?.phone || '');

      const today = new Date();
      const start = new Date(today); start.setDate(today.getDate() - today.getDay()); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 14);

      const nearby = allMeetings
        .filter(m => { const d = new Date(m.date); return d >= start && d < end; })
        .map(m => ({ ...m, sectionName: sections.find(s => s.id === m.section_id)?.display_name || '' }));

      if (nearby.length > 0) {
        setMeetings(nearby);
        setSelectedMeeting(nearby[Math.floor(Math.random() * nearby.length)]);
      } else {
        const mock = { id: 'mock', title: 'Cubs Meeting (Mock — no meetings this week)', date: today.toISOString().split('T')[0], sectionName: 'Cubs', description: 'A fun session' };
        setMeetings([mock]);
        setSelectedMeeting(mock);
      }
    } catch (e) { toast.error('Failed to load test data'); }
    setLoading(false);
  };

  const preview = selectedMeeting ? buildTestMessage(blocks, selectedMeeting, options, raUrl) : '';

  const handleSend = async () => {
    if (!leaderPhone) { toast.error('No phone number found in your Leader profile'); return; }
    setSending(true);
    try {
      const phone = normalizePhone(leaderPhone);
      const res = await base44.functions.invoke('whatsappSendMessage', {
        to: `${phone}@s.whatsapp.net`,
        message: preview,
      });
      if (res.data?.success !== false && !res.data?.error) {
        toast.success('Test message sent to your phone! ✅');
        onClose();
      } else {
        toast.error(res.data?.error || 'Failed to send test message');
      }
    } catch (e) { toast.error(e.message); }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🧪 Send Test Message</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-[#7413dc] border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Test Meeting</Label>
              <select
                value={selectedMeeting?.id || ''}
                onChange={e => setSelectedMeeting(meetings.find(m => m.id === e.target.value))}
                className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7413dc]"
              >
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title} — {moment(m.date).format('ddd D MMM')}{m.sectionName ? ` (${m.sectionName})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Include in test:</Label>
              {[
                { key: 'unusual_place', label: 'Unusual Location (different from usual venue)' },
                { key: 'unusual_time', label: 'Unusual Time (different from usual time)' },
                { key: 'parent_volunteers', label: 'Parent Volunteers (include mock names)' },
              ].map(c => (
                <div key={c.key} className="flex items-center gap-2">
                  <Checkbox id={`test-${c.key}`} checked={!!options[c.key]} onCheckedChange={v => setOptions(o => ({ ...o, [c.key]: !!v }))} />
                  <label htmlFor={`test-${c.key}`} className="text-sm text-gray-700 cursor-pointer">{c.label}</label>
                </div>
              ))}
            </div>

            <div>
              <Label className="text-sm font-medium">Preview</Label>
              <div className="mt-1 bg-gray-900 text-green-300 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {preview || '_No content_'}
              </div>
            </div>

            <div className={`rounded-lg px-3 py-2 text-xs ${leaderPhone ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              📱 {leaderPhone ? `Sending to: ${leaderPhone}` : 'No phone number in your Leader profile — add one in Admin Settings'}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={handleSend} disabled={sending || !leaderPhone} className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white">
                {sending ? 'Sending...' : '📤 Send Test'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}