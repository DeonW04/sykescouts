import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Moon } from 'lucide-react';

export default function AwardNightsAwayDialog({ open, onOpenChange, event, defaultNights }) {
  const queryClient = useQueryClient();
  const [memberNights, setMemberNights] = useState({});
  const [selectedMembers, setSelectedMembers] = useState([]);

  const { data: attendances = [] } = useQuery({
    queryKey: ['event-attendances', event?.id],
    queryFn: () => base44.entities.EventAttendance.filter({ event_id: event?.id }),
    enabled: !!event?.id,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  // When dialog opens, initialise nights and selections
  React.useEffect(() => {
    if (open && attendances.length > 0) {
      const nights = {};
      const selected = [];
      attendances.forEach(a => {
        nights[a.member_id] = defaultNights;
        selected.push(a.member_id);
      });
      setMemberNights(nights);
      setSelectedMembers(selected);
    }
  }, [open, attendances.length, defaultNights]);

  const attendeesWithMembers = attendances
    .map(a => ({ attendance: a, member: allMembers.find(m => m.id === a.member_id) }))
    .filter(({ member }) => !!member)
    .sort((a, b) => new Date(a.member.date_of_birth).getTime() - new Date(b.member.date_of_birth).getTime());

  const awardMutation = useMutation({
    mutationFn: async () => {
      const toAward = selectedMembers.map(memberId => ({
        memberId,
        nights: parseInt(memberNights[memberId]) || 0,
      })).filter(x => x.nights > 0);

      await Promise.all(toAward.map(async ({ memberId, nights }) => {
        // Fetch fresh member data to avoid stale cache issues
        const freshMembers = await base44.entities.Member.filter({ id: memberId });
        const member = freshMembers[0];
        if (!member) return;
        const current = member.total_nights_away || 0;
        await base44.entities.Member.update(memberId, {
          total_nights_away: current + nights,
        });
        await base44.entities.NightsAwayLog.create({
          member_id: memberId,
          event_id: event.id,
          notes: event.title,
          nights_count: nights,
          start_date: event.start_date ? event.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          end_date: event.end_date ? event.end_date.split('T')[0] : undefined,
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(`Nights away awarded to ${selectedMembers.length} member(s)`);
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to award nights away'),
  });

  const toggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const toggleAll = () => {
    if (selectedMembers.length === attendeesWithMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(attendeesWithMembers.map(({ member }) => member.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-600" />
            Award Nights Away
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Select attendees and set the number of nights to award each person.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{selectedMembers.length} of {attendeesWithMembers.length} selected</span>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedMembers.length === attendeesWithMembers.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {attendeesWithMembers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No attendees on this event's register yet.</p>
          ) : (
            <div className="space-y-2">
              {attendeesWithMembers.map(({ member }) => (
                <div key={member.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{member.full_name}</p>
                    <p className="text-xs text-gray-500">Current total: {member.total_nights_away || 0} nights</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Nights:</span>
                    <Input
                      type="number"
                      min="0"
                      value={memberNights[member.id] ?? defaultNights}
                      onChange={(e) => setMemberNights(prev => ({ ...prev, [member.id]: e.target.value }))}
                      className="w-20 h-9"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => awardMutation.mutate()}
            disabled={selectedMembers.length === 0 || awardMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Moon className="w-4 h-4 mr-2" />
            Award Nights Away
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}