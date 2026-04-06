import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, Mail } from 'lucide-react';

export default function ReminderDialog({ open, onOpenChange, actionRequiredId, entityType }) {
  const [sendEmail, setSendEmail] = useState(true);
  const [sendPush, setSendPush] = useState(true);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!sendEmail && !sendPush) {
      toast.error('Please select at least one notification method');
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendActionNotification', {
        actionRequiredId,
        entityType,
        sendEmail,
        sendPush,
      });
      const { emailsSent = 0, pushSent = 0 } = res.data;
      const parts = [];
      if (sendEmail) parts.push(`${emailsSent} email(s)`);
      if (sendPush) parts.push(`${pushSent} push notification(s)`);
      toast.success(`Reminder sent: ${parts.join(' + ')}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to send reminder: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Reminder</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">Choose how to remind parents who haven't responded yet:</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox
                id="remind-email"
                checked={sendEmail}
                onCheckedChange={setSendEmail}
              />
              <Label htmlFor="remind-email" className="flex items-center gap-2 cursor-pointer font-medium">
                <Mail className="w-4 h-4 text-blue-500" />
                Email
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox
                id="remind-push"
                checked={sendPush}
                onCheckedChange={setSendPush}
              />
              <Label htmlFor="remind-push" className="flex items-center gap-2 cursor-pointer font-medium">
                <Bell className="w-4 h-4 text-purple-500" />
                Push Notification
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || (!sendEmail && !sendPush)}
            className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white"
          >
            {sending ? 'Sending...' : 'Send Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}