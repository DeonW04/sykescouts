import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, RefreshCw, MessageCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppTestTab() {
  const [recipientType, setRecipientType] = useState('number');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('Reply YES to confirm or NO to decline.');
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadMessages = async () => {
    setLoadingMessages(true);
    const res = await base44.entities.WhatsAppMessage.list('-timestamp', 50);
    setMessages(res);
    setLoadingMessages(false);
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    const res = await base44.functions.invoke('whatsappGetGroups', {});
    if (res.data?.groups) setGroups(res.data.groups);
    else toast.error(res.data?.error || 'Failed to fetch groups');
    setLoadingGroups(false);
  };

  useEffect(() => { loadMessages(); }, []);

  const handleSend = async () => {
    if (!to) { toast.error('Select a recipient'); return; }
    if (!message.trim()) { toast.error('Enter a message'); return; }
    setSending(true);
    const res = await base44.functions.invoke('whatsappSendMessage', {
      to,
      message: message.trim(),
      is_group: recipientType === 'group'
    });
    if (res.data?.success) {
      toast.success('Message sent!');
      loadMessages();
    } else {
      toast.error(res.data?.error || 'Failed to send');
    }
    setSending(false);
  };

  const handlePoll = async () => {
    setPolling(true);
    const res = await base44.functions.invoke('whatsappPollMessages', {});
    if (res.data?.success !== undefined) {
      if (res.data.messages_received > 0) {
        toast.success(`Received ${res.data.messages_received} new message(s)`);
        loadMessages();
      } else {
        toast.info('No new messages');
      }
    } else {
      toast.error(res.data?.error || 'Poll failed');
    }
    setPolling(false);
  };

  const ParsedBadge = ({ val }) => {
    if (!val) return null;
    if (val === 'yes') return <Badge className="bg-green-100 text-green-700 text-xs">✅ Yes</Badge>;
    if (val === 'no') return <Badge className="bg-red-100 text-red-700 text-xs">❌ No</Badge>;
    return <Badge className="bg-gray-100 text-gray-500 text-xs">? Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Send Panel */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" />Send Test Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient type */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={recipientType === 'number' ? 'default' : 'outline'}
              onClick={() => { setRecipientType('number'); setTo(''); }}
              className={recipientType === 'number' ? 'bg-[#7413dc]' : ''}
            >
              📱 Phone Number
            </Button>
            <Button
              size="sm"
              variant={recipientType === 'group' ? 'default' : 'outline'}
              onClick={() => { setRecipientType('group'); setTo(''); loadGroups(); }}
              className={recipientType === 'group' ? 'bg-[#7413dc]' : ''}
            >
              👥 Group
            </Button>
          </div>

          {recipientType === 'number' ? (
            <div className="space-y-2">
              <Label>Phone Number (international format, no +)</Label>
              <Input placeholder="447911123456" value={to} onChange={e => setTo(e.target.value)} />
              <p className="text-xs text-gray-400">UK example: 447911123456 (44 = country code, no leading 0)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Select Group</Label>
                <Button size="sm" variant="ghost" onClick={loadGroups} disabled={loadingGroups} className="h-6 text-xs">
                  <RefreshCw className={`w-3 h-3 mr-1 ${loadingGroups ? 'animate-spin' : ''}`} />{loadingGroups ? 'Fetching...' : 'Refresh groups'}
                </Button>
              </div>
              {groups.length > 0 ? (
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger><SelectValue placeholder="Choose a group..." /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id.replace('@g.us', '')}>
                        {g.name} ({g.participant_count} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-500 italic">{loadingGroups ? 'Loading groups...' : 'Click "Refresh groups" to load your WhatsApp groups.'}</p>
              )}
              <p className="text-xs text-amber-600">⚠️ Group messages are one-way announcements. Replies from groups are not parsed.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Type your test message..."
            />
          </div>

          <Button onClick={handleSend} disabled={sending || !to} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
            <Send className="w-4 h-4 mr-2" />{sending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      {/* Message Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4" />Message Log</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePoll} disabled={polling}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${polling ? 'animate-spin' : ''}`} />{polling ? 'Polling...' : 'Poll Now'}
              </Button>
              <Button size="sm" variant="outline" onClick={loadMessages} disabled={loadingMessages}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingMessages ? 'animate-spin' : ''}`} />Refresh Log
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Messages auto-poll every 5 minutes. Click "Poll Now" to check immediately.</p>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">No messages yet. Send a test message above.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex items-start gap-3 p-3 rounded-lg border ${msg.direction === 'outbound' ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="mt-0.5">
                    {msg.direction === 'outbound'
                      ? <ArrowUpRight className="w-4 h-4 text-purple-500" />
                      : <ArrowDownLeft className="w-4 h-4 text-green-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {msg.direction === 'outbound'
                          ? `→ ${msg.to_number}${msg.is_group ? ' (group)' : ''}`
                          : `← ${msg.from_number}${msg.is_group ? ` in ${msg.group_id}` : ''}`
                        }
                      </span>
                      {msg.parsed_response && <ParsedBadge val={msg.parsed_response} />}
                      <span className="text-xs text-gray-400 ml-auto">{new Date(msg.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-800 break-words">{msg.message_text}</p>
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