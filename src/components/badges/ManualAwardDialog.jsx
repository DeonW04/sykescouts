import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Award } from 'lucide-react';
import { toast } from 'sonner';

export default function ManualAwardDialog({ badge, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: existingAwards = [] } = useQuery({
    queryKey: ['awards', badge?.id],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ badge_id: badge.id }),
    enabled: !!badge,
  });

  const awardBadgeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MemberBadgeAward.create({
        member_id: selectedMember,
        badge_id: badge.id,
        completed_date: new Date().toISOString().split('T')[0],
        award_status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      setSelectedMember('');
      onOpenChange(false);
      toast.success('Badge award created');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  // Filter members who haven't already received this badge
  const availableMembers = members.filter(m => 
    !existingAwards.some(a => a.member_id === m.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Award {badge?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {badge?.image_url && (
            <div className="flex justify-center">
              <img src={badge.image_url} alt={badge.name} className="w-24 h-24 object-contain" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Select Member</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a member..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map(member => {
                  const section = sections.find(s => s.id === member.section_id);
                  return (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name} ({section?.display_name || 'No section'})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {availableMembers.length === 0 && (
              <p className="text-sm text-gray-500">
                All eligible members have already received this badge.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => awardBadgeMutation.mutate()}
            disabled={!selectedMember || awardBadgeMutation.isPending}
            className="bg-[#7413dc] hover:bg-[#5c0fb0]"
          >
            <Award className="w-4 h-4 mr-2" />
            Award Badge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}