import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandHeart, Lock, Unlock, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function VolunteerSummaryCard({ eventId, programmeId }) {
  const queryClient = useQueryClient();

  const filterKey = eventId ? { event_id: eventId } : { programme_id: programmeId };
  const queryId = eventId || programmeId;

  const { data: volunteerActions = [] } = useQuery({
    queryKey: ['volunteer-actions', queryId],
    queryFn: async () => {
      const all = await base44.entities.ActionRequired.filter(filterKey);
      return all.filter(a => a.action_purpose === 'volunteer');
    },
    enabled: !!queryId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['volunteer-responses', queryId],
    queryFn: async () => {
      if (volunteerActions.length === 0) return [];
      const all = await base44.entities.ActionResponse.filter({});
      const ids = volunteerActions.map(a => a.id);
      return all.filter(r => ids.includes(r.action_required_id));
    },
    enabled: volunteerActions.length > 0,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const toggleOpenMutation = useMutation({
    mutationFn: ({ id, is_open }) => base44.entities.ActionRequired.update(id, { is_open }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteer-actions'] });
      toast.success('Volunteer request status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const assignments = await base44.entities.ActionAssignment.filter({ action_required_id: id });
      const resps = await base44.entities.ActionResponse.filter({ action_required_id: id });
      await Promise.all([
        ...assignments.map(a => base44.entities.ActionAssignment.delete(a.id)),
        ...resps.map(r => base44.entities.ActionResponse.delete(r.id)),
        base44.entities.ActionRequired.delete(id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteer-actions'] });
      queryClient.invalidateQueries({ queryKey: ['volunteer-responses'] });
      toast.success('Volunteer request deleted');
    },
  });

  if (volunteerActions.length === 0) return null;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="border-b border-green-100">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <HandHeart className="w-5 h-5" />
          Parent Volunteers
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {volunteerActions.map(action => {
          const yesResponses = responses.filter(
            r => r.action_required_id === action.id && r.response_value === 'Yes, I will volunteer'
          );
          const volunteers = yesResponses
            .map(r => allMembers.find(m => m.id === r.member_id))
            .filter(Boolean);

          const limit = action.volunteer_limit;
          const isFull = !action.volunteer_no_limit && limit && yesResponses.length >= limit;

          return (
            <div key={action.id} className="bg-white rounded-lg border border-green-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{action.action_text}</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    {yesResponses.length} volunteer{yesResponses.length !== 1 ? 's' : ''}
                    {limit ? ` / ${limit} needed` : action.volunteer_no_limit ? ' (no limit)' : ''}
                    {isFull && <span className="ml-2 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">Full</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleOpenMutation.mutate({ id: action.id, is_open: action.is_open === false })}
                    title={action.is_open === false ? 'Re-open' : 'Close'}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {action.is_open === false
                      ? <Unlock className="w-4 h-4 text-green-600" />
                      : <Lock className="w-4 h-4 text-gray-500" />
                    }
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(action.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {volunteers.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Volunteers
                  </p>
                  {volunteers.map(member => (
                    <div key={member.id} className="flex items-center justify-between py-1.5 px-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-800">{member.full_name}</span>
                      <span className="text-xs text-gray-500">{member.parent_one_email || '—'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No volunteers yet</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}