import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Users, Search, Pencil, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LeaderRotaSection from '../meeting/LeaderRotaSection';

export default function EventAttendeesSection({ eventId, event }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editResponses, setEditResponses] = useState({});

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

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['action-required', eventId],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: eventId }),
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['action-responses', eventId],
    queryFn: async () => {
      if (actionsRequired.length === 0) return [];
      const allResponses = await base44.entities.ActionResponse.filter({});
      const actionIds = actionsRequired.map(a => a.id);
      return allResponses.filter(r => actionIds.includes(r.action_required_id));
    },
    enabled: actionsRequired.length > 0,
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ['leaders'],
    queryFn: () => base44.entities.Leader.list(),
  });

  const addAttendanceMutation = useMutation({
    mutationFn: async (memberIds) => {
      // 1. Create EventAttendance records
      await Promise.all(memberIds.map(memberId =>
        base44.entities.EventAttendance.create({
          event_id: eventId,
          member_id: memberId,
          rsvp_status: 'not_responded',
          consent_given: false,
          payment_status: event.cost > 0 ? 'pending' : 'not_required',
        })
      ));

      // 2. Create ActionAssignment records for all open actions on this event
      const openActions = actionsRequired.filter(a => a.is_open !== false);
      if (openActions.length > 0) {
        const now = new Date().toISOString();
        const existingAssignments = await base44.entities.ActionAssignment.filter({});
        await Promise.all(
          memberIds.flatMap(memberId =>
            openActions
              .filter(action => !existingAssignments.some(
                ea => ea.action_required_id === action.id && ea.member_id === memberId
              ))
              .map(action =>
                base44.entities.ActionAssignment.create({
                  action_required_id: action.id,
                  member_id: memberId,
                  assigned_at: now,
                })
              )
          )
        );
      }

      // 3. Notify each newly added member's parents about open actions
      if (openActions.length > 0) {
        await Promise.all(
          memberIds.map(memberId =>
            base44.functions.invoke('notifyMemberOfActions', { memberId, eventId }).catch(err =>
              console.error('Notification failed for member', memberId, err)
            )
          )
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['action-responses'] });
      toast.success('Members added to event');
      setShowAddDialog(false);
      setSelectedMembers([]);
    },
  });

  const removeAttendanceMutation = useMutation({
    mutationFn: async (attendance) => {
      // Delete EventAttendance
      await base44.entities.EventAttendance.delete(attendance.id);
      // Delete ActionAssignment records for this member + event's actions
      const assignments = await base44.entities.ActionAssignment.filter({});
      const actionIds = actionsRequired.map(a => a.id);
      const toDelete = assignments.filter(
        a => a.member_id === attendance.member_id && actionIds.includes(a.action_required_id)
      );
      // Also delete ActionResponse records
      const toDeleteResponses = actionResponses.filter(
        r => r.member_id === attendance.member_id && actionIds.includes(r.action_required_id)
      );
      await Promise.all([
        ...toDelete.map(a => base44.entities.ActionAssignment.delete(a.id)),
        ...toDeleteResponses.map(r => base44.entities.ActionResponse.delete(r.id)),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-attendances'] });
      queryClient.invalidateQueries({ queryKey: ['action-responses'] });
      toast.success('Member removed from event');
    },
  });

  const saveResponsesMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const existingAssignments = await base44.entities.ActionAssignment.filter({});

      await Promise.all(
        actionsRequired.map(async (action) => {
          const newValue = editResponses[action.id];
          if (!newValue) return;

          // Ensure assignment exists
          const hasAssignment = existingAssignments.some(
            a => a.action_required_id === action.id && a.member_id === editingMember.id
          );
          if (!hasAssignment) {
            await base44.entities.ActionAssignment.create({
              action_required_id: action.id,
              member_id: editingMember.id,
              assigned_at: now,
            });
          }

          // Upsert ActionResponse
          const existing = actionResponses.find(
            r => r.action_required_id === action.id && r.member_id === editingMember.id
          );
          if (existing) {
            await base44.entities.ActionResponse.update(existing.id, {
              response_value: newValue,
              responded_at: now,
            });
          } else {
            await base44.entities.ActionResponse.create({
              action_required_id: action.id,
              member_id: editingMember.id,
              parent_email: editingMember?.parent_one_email || '',
              response_value: newValue,
              responded_at: now,
            });
          }
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-responses'] });
      toast.success('Responses updated');
      setShowEditDialog(false);
      setEditingMember(null);
      setEditResponses({});
    },
  });

  const invitedMemberIds = attendances.map(a => a.member_id);
  const availableMembers = allMembers
    .filter(m =>
      event.section_ids?.includes(m.section_id) &&
      !invitedMemberIds.includes(m.id)
    )
    .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime());

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
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleAddMembers = () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    addAttendanceMutation.mutate(selectedMembers);
  };

  const getMemberSection = (sectionId) =>
    sections.find(s => s.id === sectionId)?.display_name || 'Unknown';

  const eventSections = sections.filter(s => event.section_ids?.includes(s.id));

  const generateEmailList = () => {
    const memberEmails = attendances
      .flatMap((attendance) => {
        const member = allMembers.find(m => m.id === attendance.member_id);
        return member ? [member.parent_one_email, member.parent_two_email].filter(Boolean) : [];
      });
    const leaderEmails = leaders
      .filter(leader => leader.section_ids?.some(sid => event.section_ids?.includes(sid)))
      .map(leader => {
        const user = allMembers.find(m => m.user_id === leader.user_id);
        return user?.email;
      })
      .filter(Boolean);
    return [...new Set([...memberEmails, ...leaderEmails])].join(', ');
  };

  const handleCopyEmails = () => {
    const emailList = generateEmailList();
    navigator.clipboard.writeText(emailList);
    toast.success(`${emailList.split(', ').length} email addresses copied to clipboard`);
  };

  // Get response for a member+action — only check response_value
  const getActionResponse = (memberId, actionId) => {
    const response = actionResponses.find(
      r => r.action_required_id === actionId && r.member_id === memberId
    );
    if (!response || !response.response_value) return { display: '—', response: null };

    const action = actionsRequired.find(a => a.id === actionId);
    const val = response.response_value;
    if (!action) return { display: val, response };

    if (action.action_purpose === 'attendance') {
      return { display: val === 'yes' || val === 'Yes, attending' ? '✓' : '✗', response };
    }
    if (action.action_purpose === 'consent') {
      return { display: val === 'yes' || val === 'I give consent' ? '✓ Consent' : '✗ No consent', response };
    }
    if (action.action_purpose === 'volunteer') {
      return { display: val === 'Yes, I will volunteer' ? '🙋 Yes' : '✗ No', response };
    }
    return { display: val, response };
  };

  const handleOpenEditDialog = (member) => {
    setEditingMember(member);
    const responses = {};
    actionsRequired.forEach(action => {
      const response = actionResponses.find(
        r => r.action_required_id === action.id && r.member_id === member.id
      );
      responses[action.id] = response?.response_value || '';
    });
    setEditResponses(responses);
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      <LeaderRotaSection eventId={eventId} sectionId={eventSections[0]?.id} />

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
            <div className="flex gap-2">
              <Button onClick={handleCopyEmails} variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Copy Emails
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Members
              </Button>
            </div>
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
                  {attendances
                    .map((attendance) => ({
                      attendance,
                      member: allMembers.find(m => m.id === attendance.member_id),
                    }))
                    .filter(({ member }) => member)
                    .sort((a, b) => new Date(a.member.date_of_birth).getTime() - new Date(b.member.date_of_birth).getTime())
                    .map(({ attendance, member }) => (
                      <TableRow key={attendance.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{getMemberSection(member.section_id)}</TableCell>
                        {actionsRequired.map((action) => {
                          const { display, response } = getActionResponse(member.id, action.id);
                          return (
                            <TableCell key={action.id}>
                              <span className={`text-sm font-medium ${response ? 'text-green-700' : 'text-gray-400'}`}>
                                {display}
                              </span>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDialog(member)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttendanceMutation.mutate(attendance)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Response Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Responses for {editingMember?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {actionsRequired.map(action => (
              <div key={action.id} className="space-y-2">
                <Label>{action.column_title}</Label>
                <p className="text-sm text-gray-600">{action.action_text}</p>
                {action.action_purpose === 'volunteer' ? (
                  <Select
                    value={editResponses[action.id] || ''}
                    onValueChange={(value) => setEditResponses({ ...editResponses, [action.id]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select response" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes, I will volunteer">Yes, I will volunteer</SelectItem>
                      <SelectItem value="No, not this time">No, not this time</SelectItem>
                    </SelectContent>
                  </Select>
                ) : action.action_purpose === 'attendance' ? (
                  <Select
                    value={editResponses[action.id] || ''}
                    onValueChange={(value) => setEditResponses({ ...editResponses, [action.id]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select response" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes, attending">Yes, attending</SelectItem>
                      <SelectItem value="No, not attending">No, not attending</SelectItem>
                    </SelectContent>
                  </Select>
                ) : action.action_purpose === 'consent' ? (
                  <Select
                    value={editResponses[action.id] || ''}
                    onValueChange={(value) => setEditResponses({ ...editResponses, [action.id]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select response" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I give consent">I give consent</SelectItem>
                      <SelectItem value="I do not give consent">I do not give consent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : action.action_purpose === 'custom_dropdown' ? (
                  <Select
                    value={editResponses[action.id] || ''}
                    onValueChange={(value) => setEditResponses({ ...editResponses, [action.id]: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      {action.dropdown_options?.map((option, idx) => (
                        <SelectItem key={idx} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editResponses[action.id] || ''}
                    onChange={(e) => setEditResponses({ ...editResponses, [action.id]: e.target.value })}
                    placeholder="Enter response"
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={() => saveResponsesMutation.mutate()} disabled={saveResponsesMutation.isPending}>
              Save All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
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
              <p className="text-sm text-gray-600">{selectedMembers.length} member(s) selected</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
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