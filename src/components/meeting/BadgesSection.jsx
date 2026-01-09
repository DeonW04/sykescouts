import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function BadgesSection({ programmeId, entityType = 'programme' }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    badge_name: '',
    criteria: '',
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['meeting-badges', programmeId, entityType],
    queryFn: () => {
      const filter = entityType === 'event'
        ? { event_id: programmeId }
        : { programme_id: programmeId };
      return base44.entities.MeetingBadge.filter(filter);
    },
    enabled: !!programmeId,
  });

  const createBadgeMutation = useMutation({
    mutationFn: (data) => {
      const badgeData = entityType === 'event'
        ? { event_id: programmeId, ...data }
        : { programme_id: programmeId, ...data };
      return base44.entities.MeetingBadge.create(badgeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-badges'] });
      setShowDialog(false);
      setFormData({ badge_name: '', criteria: '' });
      toast.success('Badge criteria added');
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id) => base44.entities.MeetingBadge.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-badges'] });
      toast.success('Badge criteria deleted');
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Badge Criteria</CardTitle>
            <Button onClick={() => setShowDialog(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Badge Criteria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No badge criteria added yet</p>
          ) : (
            <div className="space-y-2">
              {badges.map(badge => (
                <div key={badge.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Award className="w-5 h-5 text-[#7413dc] mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{badge.badge_name}</p>
                    <p className="text-sm text-gray-600 mt-1">{badge.criteria}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBadgeMutation.mutate(badge.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Badge Criteria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Badge Name *</Label>
              <Input
                value={formData.badge_name}
                onChange={(e) => setFormData({ ...formData, badge_name: e.target.value })}
                placeholder="e.g., Fire Safety Badge"
              />
            </div>
            <div className="space-y-2">
              <Label>Criteria Covered *</Label>
              <Textarea
                value={formData.criteria}
                onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                placeholder="e.g., Learn how to use a fire extinguisher"
                className="min-h-[100px]"
              />
            </div>
            <Button
              onClick={() => createBadgeMutation.mutate(formData)}
              disabled={!formData.badge_name || !formData.criteria || createBadgeMutation.isPending}
              className="w-full"
            >
              Add Badge Criteria
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}