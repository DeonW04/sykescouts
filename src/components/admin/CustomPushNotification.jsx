import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, Users, User } from 'lucide-react';
import { toast } from 'sonner';

const APP_PAGES = [
  { label: 'Home (App Dashboard)', value: '/app' },
  { label: 'Programme / Meetings', value: '/app?tab=programme' },
  { label: 'Events', value: '/app?tab=events' },
  { label: 'Badges', value: '/app?tab=badges' },
  { label: 'My Child', value: '/app?tab=mychild' },
  { label: 'Settings', value: '/app?tab=settings' },
];

export default function CustomPushNotification() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetUrl, setTargetUrl] = useState('/app');
  const [customUrl, setCustomUrl] = useState('');
  const [targetMode, setTargetMode] = useState('all_parents'); // all_parents | individual
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const { data: parentSubs = [] } = useQuery({
    queryKey: ['parent-subs-for-push'],
    queryFn: () => base44.entities.PushSubscription.filter({ user_role: 'parent' }),
  });

  const handleAddEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && !selectedEmails.includes(e)) {
      setSelectedEmails(prev => [...prev, e]);
      setEmailInput('');
    }
  };

  const handleSelectParent = (email) => {
    if (!selectedEmails.includes(email)) setSelectedEmails(prev => [...prev, email]);
  };

  const finalUrl = customUrl.trim() || targetUrl;

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        url: finalUrl,
        target_all_parents: targetMode === 'all_parents',
        target_user_emails: targetMode === 'individual' ? selectedEmails : [],
      };
      const res = await base44.functions.invoke('sendPushNotification', payload);
      const { sent = 0, failed = 0 } = res.data || {};
      toast.success(`Sent to ${sent} device${sent !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
      setTitle('');
      setMessage('');
      setSelectedEmails([]);
    } catch (err) {
      toast.error('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#7413dc]" />
          Custom Push Notification
        </CardTitle>
        <p className="text-sm text-gray-500">Send a custom notification to parents. They must have notifications enabled.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Target */}
        <div className="space-y-2">
          <Label>Send to</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setTargetMode('all_parents')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${targetMode === 'all_parents' ? 'bg-[#7413dc] border-[#7413dc] text-white' : 'border-gray-200 text-gray-600 hover:border-[#7413dc]/40'}`}
            >
              <Users className="w-4 h-4" />
              All Parents ({parentSubs.length})
            </button>
            <button
              onClick={() => setTargetMode('individual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${targetMode === 'individual' ? 'bg-[#7413dc] border-[#7413dc] text-white' : 'border-gray-200 text-gray-600 hover:border-[#7413dc]/40'}`}
            >
              <User className="w-4 h-4" />
              Select Parents
            </button>
          </div>

          {targetMode === 'individual' && (
            <div className="space-y-2">
              <div className="border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {parentSubs.length === 0 && <p className="text-xs text-gray-400">No parents with notifications enabled</p>}
                {parentSubs.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => handleSelectParent(sub.user_email)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${selectedEmails.includes(sub.user_email) ? 'bg-[#7413dc]/10 text-[#7413dc] font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {sub.user_email} {selectedEmails.includes(sub.user_email) && '✓'}
                  </button>
                ))}
              </div>
              {selectedEmails.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedEmails.map(e => (
                    <span key={e} className="text-xs bg-[#7413dc]/10 text-[#7413dc] px-2 py-0.5 rounded-full flex items-center gap-1">
                      {e}
                      <button onClick={() => setSelectedEmails(p => p.filter(x => x !== e))} className="text-[#7413dc]/60 hover:text-[#7413dc]">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label>Notification title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 🏕️ Camp Reminder" maxLength={60} />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Don't forget to bring your kit list for the camp this weekend!" rows={3} maxLength={200} />
          <p className="text-xs text-gray-400 text-right">{message.length}/200</p>
        </div>

        {/* URL / Deep link */}
        <div className="space-y-1.5">
          <Label>When tapped, open</Label>
          <Select value={targetUrl} onValueChange={setTargetUrl}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_PAGES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              <SelectItem value="custom">Custom URL…</SelectItem>
            </SelectContent>
          </Select>
          {targetUrl === 'custom' && (
            <Input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="e.g. /app?tab=events" />
          )}
        </div>

        <Button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim() || (targetMode === 'individual' && selectedEmails.length === 0)}
          className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          {sending ? 'Sending…' : 'Send Notification'}
        </Button>
      </CardContent>
    </Card>
  );
}