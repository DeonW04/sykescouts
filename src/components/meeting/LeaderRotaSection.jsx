import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function LeaderRotaSection({ programmeId, eventId, sectionId }) {
  const queryClient = useQueryClient();

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

  const { data: users = [] } = useQuery({
    queryKey: ['leader-users', leaders.map(l => l.user_id).sort().join(',')],
    queryFn: async () => {
      // Get user IDs from leaders
      const leaderUserIds = leaders.map(l => l.user_id).filter(Boolean);
      if (leaderUserIds.length === 0) return [];
      
      // Fetch only users that are leaders
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => leaderUserIds.includes(u.id));
    },
    enabled: leaders.length > 0,
  });

  const { data: leaderAttendance = [] } = useQuery({
    queryKey: ['leader-attendance', programmeId, eventId],
    queryFn: () => {
      const query = programmeId ? { programme_id: programmeId } : { event_id: eventId };
      return base44.entities.LeaderAttendance.filter(query);
    },
    enabled: !!(programmeId || eventId),
  });

  const { data: parentVolunteers = [] } = useQuery({
    queryKey: ['parent-volunteers', programmeId, eventId],
    queryFn: () => {
      const query = programmeId ? { programme_id: programmeId } : { event_id: eventId };
      return base44.entities.ParentVolunteer.filter(query);
    },
    enabled: !!(programmeId || eventId),
  });

  const updateLeaderAttendanceMutation = useMutation({
    mutationFn: async ({ leaderId, status }) => {
      const existing = leaderAttendance.find(a => a.leader_id === leaderId);
      const data = {
        leader_id: leaderId,
        status,
        ...(programmeId ? { programme_id: programmeId } : { event_id: eventId }),
      };

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

  const sendVolunteerRequestMutation = useMutation({
    mutationFn: async () => {
      // Get all members in this section
      const members = await base44.entities.Member.filter({ section_id: sectionId, active: true });
      
      // Get unique parent emails
      const parentEmails = new Set();
      members.forEach(member => {
        if (member.parent_one_email) parentEmails.add(member.parent_one_email);
        if (member.parent_two_email) parentEmails.add(member.parent_two_email);
      });

      // Create action required for parent volunteer request
      return base44.entities.ActionRequired.create({
        ...(programmeId ? { programme_id: programmeId } : { event_id: eventId }),
        action_text: 'Can you volunteer to help at this session?',
        column_title: 'Parent Volunteer',
        action_purpose: 'attendance',
        is_open: true,
      });
    },
    onSuccess: () => {
      toast.success('Volunteer request sent to parents');
      queryClient.invalidateQueries({ queryKey: ['actions-required'] });
    },
  });

  const getLeaderAttendanceStatus = (leaderId) => {
    const record = leaderAttendance.find(a => a.leader_id === leaderId);
    return record?.status || null;
  };

  const getLeaderName = (leaderId) => {
    const leader = leaders.find(l => l.id === leaderId);
    const user = users.find(u => u.id === leader?.user_id);
    return user?.display_name || user?.full_name || 'Unknown';
  };

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
        {/* Leaders Section */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Leaders
          </h3>
          <div className="space-y-2">
            {leaders.map((leader) => {
              const status = getLeaderAttendanceStatus(leader.id);
              return (
                <div key={leader.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#004851] rounded-full flex items-center justify-center text-white font-semibold">
                      {getLeaderName(leader.id).charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{getLeaderName(leader.id)}</p>
                    </div>
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

        {/* Parent Volunteers Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Parent Volunteers
            </h3>
            <Button
              size="sm"
              onClick={() => sendVolunteerRequestMutation.mutate()}
              disabled={sendVolunteerRequestMutation.isPending}
            >
              Request Volunteers
            </Button>
          </div>
          <div className="space-y-2">
            {parentVolunteers.filter(v => v.response === 'yes').length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No parent volunteers yet</p>
            ) : (
              parentVolunteers.filter(v => v.response === 'yes').map((volunteer) => (
                <div key={volunteer.id} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {volunteer.parent_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{volunteer.parent_name}</p>
                    <p className="text-sm text-gray-600">{volunteer.parent_email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}