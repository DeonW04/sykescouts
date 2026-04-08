import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInHours } from 'date-fns';

export default function ActionSummaryPanel({ actions, entityType }) {
  const queryClient = useQueryClient();

  const actionIds = actions.map(a => a.id);

  const { data: assignments = [] } = useQuery({
    queryKey: ['action-assignments-summary', actionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.ActionAssignment.filter({});
      return all.filter(a => actionIds.includes(a.action_required_id));
    },
    enabled: actionIds.length > 0,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['action-responses-summary', actionIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.ActionResponse.filter({});
      return all.filter(r => actionIds.includes(r.action_required_id) && r.response_value);
    },
    enabled: actionIds.length > 0,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (actionId) => {
      const res = await base44.functions.invoke('sendActionNotification', {
        actionRequiredId: actionId,
        entityType,
        sendEmail: true,
        sendPush: true,
      });
      return res.data;
    },
    onSuccess: (data, actionId) => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      toast.success(`Reminder sent: ${data.emailsSent} email(s)`);
    },
    onError: (err) => toast.error('Failed to send reminder: ' + err.message),
  });

  const getActionStats = (actionId) => {
    const actionAssignments = assignments.filter(a => a.action_required_id === actionId);
    const actionResponses = responses.filter(r => r.action_required_id === actionId);
    const respondedMemberIds = new Set(actionResponses.map(r => r.member_id));
    const outstandingAssignments = actionAssignments.filter(a => !respondedMemberIds.has(a.member_id));
    const outstandingMembers = outstandingAssignments
      .map(a => allMembers.find(m => m.id === a.member_id))
      .filter(Boolean);
    return {
      total: actionAssignments.length,
      responded: actionResponses.length,
      outstanding: outstandingAssignments.length,
      outstandingMembers,
    };
  };

  const canSendReminder = (action) => {
    if (!action.reminder_sent_at) return true;
    return differenceInHours(new Date(), new Date(action.reminder_sent_at)) >= 24;
  };

  if (actions.length === 0) return null;

  return (
    <div className="space-y-4">
      {actions.map(action => {
        const stats = getActionStats(action.id);
        const deadlinePassed = action.deadline && new Date(action.deadline) < new Date();
        const deadlineSoon = action.deadline && !deadlinePassed &&
          differenceInHours(new Date(action.deadline), new Date()) <= 48;
        const reminderAllowed = canSendReminder(action);
        const isSending = sendReminderMutation.isPending;

        return (
          <Card key={action.id} className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-base">{action.column_title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{action.action_text}</p>
                  {action.deadline && (
                    <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${
                      deadlinePassed ? 'text-red-600' : deadlineSoon ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      {(deadlinePassed || deadlineSoon) && <AlertTriangle className="w-3 h-3" />}
                      <Clock className="w-3 h-3" />
                      {deadlinePassed
                        ? `Deadline passed ${formatDistanceToNow(new Date(action.deadline), { addSuffix: true })}`
                        : `Deadline ${formatDistanceToNow(new Date(action.deadline), { addSuffix: true })}`
                      }
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => sendReminderMutation.mutate(action.id)}
                  disabled={!reminderAllowed || isSending}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0"
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  {reminderAllowed
                    ? 'Send Reminder'
                    : `Sent ${formatDistanceToNow(new Date(action.reminder_sent_at), { addSuffix: true })}`
                  }
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">Assigned</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-bold text-green-700">{stats.responded}</p>
                  <p className="text-xs text-green-600">Responded</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{stats.outstanding}</p>
                  <p className="text-xs text-orange-600">Outstanding</p>
                </div>
              </div>

              {/* Outstanding members list */}
              {stats.outstandingMembers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Outstanding ({stats.outstanding})</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {stats.outstandingMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between py-1.5 px-3 bg-orange-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-800">{member.full_name}</span>
                        <span className="text-xs text-gray-500">{member.parent_one_email || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {stats.outstanding === 0 && stats.total > 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">All members have responded!</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}