import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function EventAttendeesSection({ eventId, event }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: attendances = [] } = useQuery({
    queryKey: ['event-attendances', eventId],
    queryFn: () => base44.entities.EventAttendance.filter({ event_id: eventId }),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.list(),
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['action-responses', eventId],
    queryFn: () => base44.entities.ActionResponse.filter({ entity_id: eventId }),
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['action-required', eventId],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: eventId }),
  });

  const addAttendanceMutation = useMutation({
    mutationFn: (memberIds) => {
      return Promise.all(
        memberIds.map(memberId =>
          base44.entities.EventAttendance.create({
            event_id: eventId,
            member_id: memberId,
            rsvp_status: 'not_responded',
            consent_given: false,
            payment_status: event.cost > 0 ? 'pending' : 'not_required',
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendances'] });
      toast.success('Members added to event');
      setShowAddDialog(false);
      setSelectedMembers([]);
    },
  });

  const removeAttendanceMutation = useMutation({
    mutationFn: (attendanceId) => base44.entities.EventAttendance.delete(attendanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendances'] });
      toast.success('Member removed from event');
    },
  });

  const invitedMemberIds = attendances.map(a => a.member_id);
  const availableMembers = allMembers.filter(m => 
    event.section_ids?.includes(m.section_id) && 
    !invitedMemberIds.includes(m.id)
  );

  const filteredMembers = availableMembers.filter(m =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
    }
  };

  const handleToggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleAddMembers = () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    addAttendanceMutation.mutate(selectedMembers);
  };

  const getMemberSection = (sectionId) => {
    return sections.find(s => s.id === sectionId)?.display_name || 'Unknown';
  };

  const getActionResponse = (memberId, actionId) => {
    const response = actionResponses.find(
      r => r.child_member_id === memberId && r.action_id === actionId
    );
    if (!response) return '-';
    
    if (response.status !== 'completed') return 'Pending';
    
    const action = actionsRequired.find(a => a.id === actionId);
    if (!action) return response.response_value || 'Yes';
    
    if (action.action_purpose === 'attendance') {
      return response.response_value === 'yes' ? '✓' : '✗';
    }
    if (action.action_purpose === 'consent') {
      return response.response_value === 'yes' ? '✓ Consent Given' : '✗ Not Given';
    }
    return response.response_value || '-';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Event Attendees
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {attendances.length} member(s) invited to this event
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Members
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attendances.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No members invited yet</p>
              <p className="text-sm">Click "Add Members" to invite members to this event</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Section</TableHead>
                    {actionsRequired.map((action) => (
                      <TableHead key={action.id}>{action.column_title}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((attendance) => {
                    const member = allMembers.find(m => m.id === attendance.member_id);
                    if (!member) return null;

                    return (
                      <TableRow key={attendance.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{getMemberSection(member.section_id)}</TableCell>
                        {actionsRequired.map((action) => (
                          <TableCell key={action.id}>
                            {getActionResponse(member.id, action.id)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttendanceMutation.mutate(attendance.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Members to Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedMembers.length === filteredMembers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No available members to add</p>
                <p className="text-sm">All members from the event sections have been invited</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => handleToggleMember(member.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-sm text-gray-600">{getMemberSection(member.section_id)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                {selectedMembers.length} member(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMembers}
                  disabled={selectedMembers.length === 0 || addAttendanceMutation.isPending}
                >
                  Add {selectedMembers.length} Member(s)
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}