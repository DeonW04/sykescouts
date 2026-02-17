import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, User, Search, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkBadgeUpdate() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('by-member');
  const [step, setStep] = useState(1);
  
  // By Member mode state
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [badgeSearch, setBadgeSearch] = useState('');
  
  // By Badge mode state
  const [badgeSearchByBadge, setBadgeSearchByBadge] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchByBadge, setMemberSearchByBadge] = useState('');
  
  // Confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: badgeDefinitions = [] } = useQuery({
    queryKey: ['badge-definitions'],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress'],
    queryFn: () => base44.entities.MemberBadgeProgress.filter({}),
  });

  const completeBadgesMutation = useMutation({
    mutationFn: async ({ memberIds, badgeIds }) => {
      const results = [];
      for (const memberId of memberIds) {
        for (const badgeId of badgeIds) {
          // Check if progress already exists
          const existing = badgeProgress.find(
            bp => bp.member_id === memberId && bp.badge_id === badgeId
          );
          
          if (existing) {
            // Update to completed
            await base44.entities.MemberBadgeProgress.update(existing.id, {
              status: 'completed',
              completed_date: new Date().toISOString().split('T')[0],
            });
          } else {
            // Create new completed badge
            await base44.entities.MemberBadgeProgress.create({
              member_id: memberId,
              badge_id: badgeId,
              status: 'completed',
              started_date: new Date().toISOString().split('T')[0],
              completed_date: new Date().toISOString().split('T')[0],
            });
          }
          results.push({ memberId, badgeId, success: true });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-progress'] });
      toast.success('Badges completed successfully!');
      handleReset();
    },
    onError: (error) => {
      toast.error('Error completing badges: ' + error.message);
    },
  });

  const handleReset = () => {
    setStep(1);
    setSelectedMember(null);
    setSelectedBadges([]);
    setSelectedBadge(null);
    setSelectedMembers([]);
    setMemberSearch('');
    setBadgeSearch('');
    setBadgeSearchByBadge('');
    setMemberSearchByBadge('');
    setShowConfirmation(false);
  };

  const handleConfirm = () => {
    if (mode === 'by-member') {
      completeBadgesMutation.mutate({
        memberIds: [selectedMember.id],
        badgeIds: selectedBadges.map(b => b.id),
      });
    } else {
      completeBadgesMutation.mutate({
        memberIds: selectedMembers.map(m => m.id),
        badgeIds: [selectedBadge.id],
      });
    }
  };

  // Filter members for by-member mode
  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Filter badges for by-member mode
  const filteredBadges = badgeDefinitions.filter(b => {
    if (!selectedMember) return false;
    
    // Exclude special badges
    const excludedBadges = ['gold award', 'nights away', 'hikes away'];
    if (excludedBadges.some(excluded => b.name?.toLowerCase().includes(excluded))) {
      return false;
    }
    
    // Only show activity, core, staged, and challenge badges
    const allowedCategories = ['activity', 'core', 'staged', 'challenge'];
    if (!allowedCategories.includes(b.category?.toLowerCase())) {
      return false;
    }
    
    const matchesSearch = b.name?.toLowerCase().includes(badgeSearch.toLowerCase());
    return matchesSearch;
  });

  // Filter badges for by-badge mode
  const filteredBadgesByBadge = badgeDefinitions.filter(b => {
    // Exclude special badges
    const excludedBadges = ['gold award', 'nights away', 'hikes away'];
    if (excludedBadges.some(excluded => b.name?.toLowerCase().includes(excluded))) {
      return false;
    }
    
    // Only show activity, core, staged, and challenge badges
    const allowedCategories = ['activity', 'core', 'staged', 'challenge'];
    if (!allowedCategories.includes(b.category?.toLowerCase())) {
      return false;
    }
    
    return b.name?.toLowerCase().includes(badgeSearchByBadge.toLowerCase());
  });

  // Filter members for by-badge mode
  const filteredMembersByBadge = members.filter(m =>
    m.full_name?.toLowerCase().includes(memberSearchByBadge.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              mode === 'by-member' ? 'border-[#7413dc] bg-purple-50' : 'hover:border-gray-400'
            }`}
            onClick={() => setMode('by-member')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                By Member
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Select a member first, then choose multiple badges to complete for them.
              </p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              mode === 'by-badge' ? 'border-[#7413dc] bg-purple-50' : 'hover:border-gray-400'
            }`}
            onClick={() => setMode('by-badge')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                By Badge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Select a badge first, then choose multiple members to award it to.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BY MEMBER MODE */}
      {mode === 'by-member' && step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Step 1: Select Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for a member..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredMembers.map(member => (
                <div
                  key={member.id}
                  onClick={() => {
                    setSelectedMember(member);
                    setStep(2);
                  }}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{member.full_name}</p>
                  <p className="text-sm text-gray-500">
                    {members.find(m => m.id === member.id)?.section_id || 'No section'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'by-member' && step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Step 2: Select Badges for {selectedMember?.full_name}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for badges..."
                value={badgeSearch}
                onChange={(e) => setBadgeSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedBadges.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium mb-2">{selectedBadges.length} badge(s) selected</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBadges.map(badge => (
                    <Badge key={badge.id} className="bg-purple-600">
                      {badge.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredBadges.map(badge => {
                const isSelected = selectedBadges.some(b => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedBadges([...selectedBadges, badge]);
                        } else {
                          setSelectedBadges(selectedBadges.filter(b => b.id !== badge.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{badge.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={selectedBadges.length === 0}
              className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              Continue to Confirmation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* BY BADGE MODE */}
      {mode === 'by-badge' && step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Step 1: Select Badge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for a badge..."
                value={badgeSearchByBadge}
                onChange={(e) => setBadgeSearchByBadge(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredBadgesByBadge.map(badge => (
                <div
                  key={badge.id}
                  onClick={() => {
                    setSelectedBadge(badge);
                    setStep(2);
                  }}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-sm text-gray-500 capitalize">{badge.category}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'by-badge' && step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Step 2: Select Members for {selectedBadge?.name}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for members..."
                value={memberSearchByBadge}
                onChange={(e) => setMemberSearchByBadge(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedMembers.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium mb-2">{selectedMembers.length} member(s) selected</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map(member => (
                    <Badge key={member.id} className="bg-purple-600">
                      {member.full_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredMembersByBadge.map(member => {
                const isSelected = selectedMembers.some(m => m.id === member.id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers([...selectedMembers, member]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{member.full_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              onClick={() => setShowConfirmation(true)}
              disabled={selectedMembers.length === 0}
              className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              Continue to Confirmation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Confirm Badge Completion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This will mark all selected badge criteria as completed.
                This action cannot be undone automatically.
              </p>
            </div>

            {mode === 'by-member' && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Member:</p>
                  <p className="text-lg font-semibold text-purple-900">{selectedMember?.full_name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Badges to complete:</p>
                  {selectedBadges.map(badge => (
                    <div key={badge.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{badge.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'by-badge' && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Badge:</p>
                  <p className="text-lg font-semibold text-purple-900">{selectedBadge?.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Members to award:</p>
                  {selectedMembers.map(member => (
                    <div key={member.id} className="p-3 border rounded-lg">
                      <p className="font-medium">{member.full_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={completeBadgesMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {completeBadgesMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm & Complete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}