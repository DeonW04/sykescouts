import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserPlus, HandHeart, Lock, Unlock, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaderRotaSection({ programmeId, eventId, sectionId }) {
  const queryClient = useQueryClient();
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState({
    action_text: 'Can you volunteer to help at this session?',
    volunteer_limit: '',
    volunteer_no_limit: false,
  });

  const entityQuery = programmeId ? { programme_id: programmeId } : { event_id: eventId };
  const entityId = programmeId || eventId;

  const { data: section } = useQuery({
    queryKey: ['section', sectionId],
    queryFn: async () => {
      if (!sectionId) return null;
      const sections = await base44.entities.Section.filter({ id: sectionId });
      return sections[0];
    },
    enabled: !!sectionId,
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ['section-leaders', sectionId],
    queryFn: async () => {
      if (!sectionId || !section) return [];
      const allLeaders = await base44.entities.Leader.filter({});
      return allLeaders.filter(l => l.section_ids?.includes(sectionId));
    },
    enabled: !!sectionId && !!section,
  });

  const { data: leaderAttendance = [] } = useQuery({
    queryKey: ['leader-attendance', programmeId, eventId],
    queryFn: () => base44.entities.LeaderAttendance.filter(entityQuery),
    enabled: !!entityId,
  });

  const { data: volunteerActions = [] } = useQuery({
    queryKey: ['volunteer-actions', entityId],
    queryFn: async () => {
      const all = await base44.entities.ActionRequired.filter(entityQuery);
      return all.filter(a => a.action_purpose === 'volunteer');
    },
    enabled: !!entityId,
  });

  const { data: volunteerResponses = [] } = useQuery({
    queryKey: ['volunteer-responses', entityId],
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

  const updateLeaderAttendanceMutation = useMutation({
    mutationFn: async ({ leaderId, status }) => {
      const existing = leaderAttendance.find(a => a.leader_id === leaderId);
      const data = { leader_id: leaderId, status, ...entityQuery };
      if (existing) {
        return base44.entities.LeaderAttendance.update(existing.id, { status });
      } else {
        return base44.entities.LeaderAttendance.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leader-attendance'] });
      toast.success('Leader attendance updated');
    },
  });

  const createVolunteerRequestMutation = useMutation({
    mutationFn: async () => {
      const limit = volunteerForm.volunteer_no_limit ? null : (parseInt(volunteerForm.volunteer_limit) || null);
      const action = await base44.entities.ActionRequired.create({
        ...entityQuery,
        action_text: volunteerForm.action_text,
        column_title: 'Parent Volunteer',
        action_purpose: 'volunteer',
        is_open: true,
        volunteer_no_limit: volunteerForm.volunteer_no_limit,
        volunteer_limit: limit,
      });

      // Assign to all members in section
      if (sectionId) {
        const members = await base44.entities.Member.filter({ section_id: sectionId, active: true });
        const now = new Date().toISOString();
        await Promise.all(
          members.map(m =>
            base44.entities.ActionAssignment.create({
              action_required_id: action.id,
              member_id: m.id,
              assigned_at: now,
            })
          )
        );
      }

      await base44.functions.invoke('sendActionNotification', {
        actionRequiredId: action.id,
        entityType: programmeId ? 'programme' : 'event',
        sendEmail: true,
        sendPush: true,
      });
      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteer-actions'] });
      setShowVolunteerForm(false);
      setVolunteerForm({ action_text: 'Can you volunteer to help at this session?', volunteer_limit: '', volunteer_no_limit: false });
      toast.success('Volunteer request sent to parents');
    },
  });

  const toggleVolunteerActionMutation = useMutation({
    mutationFn: ({ id, is_open }) => base44.entities.ActionRequired.update(id, { is_open }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteer-actions'] });
      toast.success('Volunteer request updated');
    },
  });

  const deleteVolunteerActionMutation = useMutation({
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

  const getLeaderName = (leaderId) => {
    const leader = leaders.find(l => l.id === leaderId);
    return leader?.display_name || 'Unknown';
  };

  const getLeaderAttendanceStatus = (leaderId) =>
    leaderAttendance.find(a => a.leader_id === leaderId)?.status || null;

  if (!programmeId && !eventId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Leaders & Parent Volunteers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Leaders */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Leaders
          </h3>
          <div className="space-y-2">
            {leaders.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No leaders assigned to this section</p>
            ) : leaders.map((leader) => {
              const status = getLeaderAttendanceStatus(leader.id);
              return (
                <div key={leader.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#004851] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {getLeaderName(leader.id).charAt(0)}
                    </div>
                    <p className="font-medium text-sm">{getLeaderName(leader.id)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={status === 'attending' ? 'default' : 'outline'}
                      onClick={() => updateLeaderAttendanceMutation.mutate({ leaderId: leader.id, status: 'attending' })}
                      className={status === 'attending' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      Attending
                    </Button>
                    <Button
                      size="sm"
                      variant={status === 'busy' ? 'default' : 'outline'}
                      onClick={() => updateLeaderAttendanceMutation.mutate({ leaderId: leader.id, status: 'busy' })}
                      className={status === 'busy' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      Busy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parent Volunteers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <HandHeart className="w-4 h-4" />
              Parent Volunteers
            </h3>
            {!showVolunteerForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowVolunteerForm(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Request Volunteers
              </Button>
            )}
          </div>

          {/* Inline form */}
          {showVolunteerForm && (
            <div className="mb-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Request message</Label>
                <Input
                  value={volunteerForm.action_text}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, action_text: e.target.value })}
                  placeholder="e.g. Can you volunteer to help?"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Volunteers needed</Label>
                <div className="flex items-center gap-2 mb-1.5">
                  <Checkbox
                    id="no-limit"
                    checked={volunteerForm.volunteer_no_limit}
                    onCheckedChange={(v) => setVolunteerForm({ ...volunteerForm, volunteer_no_limit: v, volunteer_limit: '' })}
                  />
                  <label htmlFor="no-limit" className="text-sm cursor-pointer text-gray-600">No limit</label>
                </div>
                {!volunteerForm.volunteer_no_limit && (
                  <Input
                    type="number"
                    min="1"
                    value={volunteerForm.volunteer_limit}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, volunteer_limit: e.target.value })}
                    placeholder="e.g. 2"
                    className="max-w-[120px]"
                  />
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => createVolunteerRequestMutation.mutate()}
                  disabled={createVolunteerRequestMutation.isPending}
                  className="bg-[#004851] hover:bg-[#003840] text-white"
                >
                  {createVolunteerRequestMutation.isPending ? 'Sending...' : 'Send Request'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowVolunteerForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing volunteer requests */}
          {volunteerActions.length === 0 && !showVolunteerForm ? (
            <p className="text-sm text-gray-400 py-2">No volunteer requests sent yet</p>
          ) : (
            <div className="space-y-3">
              {volunteerActions.map(action => {
                const yesResponses = volunteerResponses.filter(
                  r => r.action_required_id === action.id && r.response_value === 'Yes, I will volunteer'
                );
                const volunteers = yesResponses
                  .map(r => allMembers.find(m => m.id === r.member_id))
                  .filter(Boolean);
                const limit = action.volunteer_limit;
                const isFull = !action.volunteer_no_limit && limit && yesResponses.length >= limit;

                return (
                  <div key={action.id} className="border rounded-lg overflow-hidden">
                    {/* Request header */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate">{action.action_text}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          isFull
                            ? 'bg-green-100 text-green-700'
                            : action.is_open === false
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {yesResponses.length}{limit ? `/${limit}` : ''} volunteer{yesResponses.length !== 1 ? 's' : ''}
                          {isFull ? ' · Full' : action.is_open === false ? ' · Closed' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => toggleVolunteerActionMutation.mutate({ id: action.id, is_open: action.is_open === false })}
                          className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                          title={action.is_open === false ? 'Re-open' : 'Close'}
                        >
                          {action.is_open === false
                            ? <Unlock className="w-3.5 h-3.5" />
                            : <Lock className="w-3.5 h-3.5" />
                          }
                        </button>
                        <button
                          onClick={() => deleteVolunteerActionMutation.mutate(action.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Volunteers list */}
                    <div className="divide-y">
                      {volunteers.length === 0 ? (
                        <p className="text-sm text-gray-400 px-3 py-2.5 italic">No volunteers yet</p>
                      ) : (
                        volunteers.map(member => (
                          <div key={member.id} className="flex items-center gap-2.5 px-3 py-2.5">
                            <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {(member.parent_one_name || member.full_name).charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{member.parent_one_name || member.full_name}'s parent</p>
                              <p className="text-xs text-gray-500 truncate">{member.parent_one_email}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}