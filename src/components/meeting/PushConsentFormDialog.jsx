import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Users, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function PushConsentFormDialog({ open, onClose, form, programmeId, entityType, entityData }) {
  const queryClient = useQueryClient();
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [pushing, setPushing] = useState(false);

  // Load members
  const { data: members = [] } = useQuery({
    queryKey: ['push-consent-members', entityType, programmeId],
    queryFn: async () => {
      let result;
      if (entityType === 'programme') {
        result = await base44.entities.Member.filter({ section_id: entityData?.section_id, active: true });
      } else {
        const attendances = await base44.entities.EventAttendance.filter({ event_id: programmeId });
        if (!attendances.length) return [];
        const memberIds = attendances.map(a => a.member_id);
        const all = await base44.entities.Member.filter({});
        result = all.filter(m => memberIds.includes(m.id));
      }
      return result.sort((a, b) => new Date(a.date_of_birth) - new Date(b.date_of_birth));
    },
    enabled: open && !!programmeId && !!entityData,
  });

  // Load "attending" members from the attendance action
  const { data: attendingMemberIds = [] } = useQuery({
    queryKey: ['push-consent-attending', entityType, programmeId],
    queryFn: async () => {
      const allActions = await base44.entities.ActionRequired.filter({});
      const attendanceAction = allActions.find(a =>
        a.action_purpose === 'attendance' &&
        (entityType === 'event' ? a.event_id === programmeId : a.programme_id === programmeId)
      );
      if (!attendanceAction) return [];
      const responses = await base44.entities.ActionResponse.filter({ action_required_id: attendanceAction.id });
      return responses
        .filter(r => r.response_value === 'Yes, attending' || r.response_value === 'attending')
        .map(r => r.member_id);
    },
    enabled: open && !!programmeId,
  });

  // Existing submissions for this form+entity
  const { data: existingSubmissions = [] } = useQuery({
    queryKey: ['push-consent-subs', programmeId, form?.id],
    queryFn: async () => {
      const all = await base44.entities.ConsentFormSubmission.filter({ form_id: form.id });
      return all.filter(s =>
        entityType === 'event' ? s.event_id === programmeId : s.programme_id === programmeId
      );
    },
    enabled: open && !!form?.id && !!programmeId,
  });

  const alreadyPushedIds = existingSubmissions.map(s => s.member_id);

  const toggle = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedMemberIds(members.map(m => m.id));
  const selectAttending = () => setSelectedMemberIds(attendingMemberIds.filter(id => members.some(m => m.id === id)));
  const selectNone = () => setSelectedMemberIds([]);

  const handlePush = async () => {
    if (selectedMemberIds.length === 0) { toast.error('Select at least one member'); return; }
    setPushing(true);
    try {
      // 1. Create an ActionRequired for this consent form if one doesn't exist yet
      const existingActions = await base44.entities.ActionRequired.filter({});
      let action = existingActions.find(a =>
        a.action_purpose === 'consent_form' &&
        a.consent_form_id === form.id &&
        (entityType === 'event' ? a.event_id === programmeId : a.programme_id === programmeId)
      );

      if (!action) {
        const actionData = {
          action_text: `Please sign: ${form.title}`,
          column_title: form.title,
          action_purpose: 'consent_form',
          consent_form_id: form.id,
          is_open: true,
        };
        if (entityType === 'event') actionData.event_id = programmeId;
        else actionData.programme_id = programmeId;
        action = await base44.entities.ActionRequired.create(actionData);
      }

      // 2. Create ConsentFormSubmission stubs for selected members (skip already pushed)
      const toCreate = selectedMemberIds.filter(id => !alreadyPushedIds.includes(id));
      await Promise.all(toCreate.map(memberId => {
        const subData = { form_id: form.id, member_id: memberId, status: 'pending' };
        if (entityType === 'event') subData.event_id = programmeId;
        else subData.programme_id = programmeId;
        return base44.entities.ConsentFormSubmission.create(subData);
      }));

      // 3. Create ActionAssignments for selected members
      const existingAssignments = await base44.entities.ActionAssignment.filter({ action_required_id: action.id });
      const alreadyAssigned = existingAssignments.map(a => a.member_id);
      const toAssign = selectedMemberIds.filter(id => !alreadyAssigned.includes(id));
      await Promise.all(toAssign.map(memberId =>
        base44.entities.ActionAssignment.create({
          action_required_id: action.id,
          member_id: memberId,
          assigned_at: new Date().toISOString(),
        })
      ));

      queryClient.invalidateQueries({ queryKey: ['consent-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['push-consent-subs'] });
      toast.success(`Pushed to ${selectedMemberIds.length} member${selectedMemberIds.length !== 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      toast.error('Failed to push: ' + err.message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-teal-600" />
            Push to Parents — {form?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select which members to send this consent form to. Parents will see it as an action required in the app.
          </p>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={selectAll} className="gap-1">
              <CheckSquare className="w-3 h-3" /> Select All ({members.length})
            </Button>
            {attendingMemberIds.length > 0 && (
              <Button size="sm" variant="outline" onClick={selectAttending} className="gap-1">
                <Users className="w-3 h-3" /> Attending ({attendingMemberIds.filter(id => members.some(m => m.id === id)).length})
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={selectNone} className="text-gray-500">None</Button>
          </div>

          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
            {members.map(member => {
              const alreadyPushed = alreadyPushedIds.includes(member.id);
              const selected = selectedMemberIds.includes(member.id);
              return (
                <div
                  key={member.id}
                  onClick={() => !alreadyPushed && toggle(member.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 ${alreadyPushed ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}
                >
                  <Checkbox
                    checked={selected}
                    disabled={alreadyPushed}
                    onCheckedChange={() => !alreadyPushed && toggle(member.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{member.full_name}</p>
                    {alreadyPushed && <p className="text-xs text-teal-600">Already sent</p>}
                  </div>
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No members found.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handlePush}
              disabled={pushing || selectedMemberIds.length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              {pushing ? 'Sending...' : `Push to ${selectedMemberIds.length} parent${selectedMemberIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}