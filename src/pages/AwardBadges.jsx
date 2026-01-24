import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Award, AlertTriangle, CheckCircle, Package, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import ManualAwardDialog from '../components/badges/ManualAwardDialog';

export default function AwardBadges() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [onlyDue, setOnlyDue] = useState(true);
  const [selectedAwards, setSelectedAwards] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [manualAwardBadge, setManualAwardBadge] = useState(null);
  const [checkingJoiningIn, setCheckingJoiningIn] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({}),
  });

  const { data: stock = [] } = useQuery({
    queryKey: ['badge-stock'],
    queryFn: () => base44.entities.BadgeStock.filter({}),
  });

  const awardBadgesMutation = useMutation({
    mutationFn: async (awardIds) => {
      const results = [];
      for (const awardId of awardIds) {
        const award = awards.find(a => a.id === awardId);
        if (!award) continue;

        // Update award status
        await base44.entities.MemberBadgeAward.update(awardId, {
          award_status: 'awarded',
          awarded_date: new Date().toISOString().split('T')[0],
          awarded_by: user.email,
        });

        // Deduct stock
        const badgeStock = stock.find(s => s.badge_id === award.badge_id);
        if (badgeStock) {
          await base44.entities.BadgeStock.update(badgeStock.id, {
            current_stock: Math.max(0, badgeStock.current_stock - 1),
            last_updated: new Date().toISOString(),
          });

          // Log adjustment
          await base44.entities.StockAdjustmentLog.create({
            badge_id: award.badge_id,
            adjustment_amount: -1,
            adjusted_by: user.email,
            adjustment_type: 'award',
            reason: `Badge awarded to ${members.find(m => m.id === award.member_id)?.full_name}`,
            related_award_id: awardId,
          });
        }

        results.push(awardId);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      setSelectedAwards([]);
      toast.success('Badges awarded successfully');
    },
  });

  const filteredAwards = awards.filter(award => {
    if (onlyDue && award.award_status !== 'pending') return false;
    
    const member = members.find(m => m.id === award.member_id);
    if (!member) return false;

    if (sectionFilter !== 'all' && member.section_id !== sectionFilter) return false;
    if (badgeFilter !== 'all' && award.badge_id !== badgeFilter) return false;

    return true;
  });

  const getStockInfo = (badgeId) => {
    return stock.find(s => s.badge_id === badgeId);
  };

  const handleAwardSelected = () => {
    if (selectedAwards.length === 0) return;

    // Check stock
    const stockIssues = [];
    const badgeGroups = {};
    
    selectedAwards.forEach(awardId => {
      const award = awards.find(a => a.id === awardId);
      if (!badgeGroups[award.badge_id]) {
        badgeGroups[award.badge_id] = [];
      }
      badgeGroups[award.badge_id].push(awardId);
    });

    Object.entries(badgeGroups).forEach(([badgeId, awardIds]) => {
      const stockInfo = getStockInfo(badgeId);
      const badge = badges.find(b => b.id === badgeId);
      const needed = awardIds.length;
      const available = stockInfo?.current_stock || 0;

      if (available < needed) {
        stockIssues.push({
          badge: badge?.name,
          needed,
          available,
        });
      }
    });

    if (stockIssues.length > 0) {
      setConfirmDialog({
        stockIssues,
        proceed: user.role === 'admin',
      });
    } else {
      awardBadgesMutation.mutate(selectedAwards);
    }
  };

  const handleSelectAll = () => {
    if (selectedAwards.length === filteredAwards.length) {
      setSelectedAwards([]);
    } else {
      setSelectedAwards(filteredAwards.map(a => a.id));
    }
  };

  const handleCheckJoiningIn = async () => {
    setCheckingJoiningIn(true);
    try {
      const response = await base44.functions.invoke('checkJoiningInBadges');
      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['awards'] });
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error('Error checking Joining In badges: ' + error.message);
    } finally {
      setCheckingJoiningIn(false);
    }
  };

  const manualBadges = badges.filter(b => b.completion_rule === 'manual' && b.category === 'special');

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('LeaderBadges'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Badges
          </Button>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Award Badges</h1>
                <p className="mt-1 text-white/80">Award completed badges to members</p>
              </div>
            </div>
            {selectedAwards.length > 0 && (
              <Button
                onClick={handleAwardSelected}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Award {selectedAwards.length} Badge{selectedAwards.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Manual Award Section */}
        {manualBadges.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Manual Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {manualBadges.map(badge => (
                  <button
                    key={badge.id}
                    onClick={() => setManualAwardBadge(badge)}
                    className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <img src={badge.image_url} alt={badge.name} className="w-20 h-20 object-contain" />
                    <p className="text-sm font-medium text-center">{badge.name}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Joining In Check */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Joining In Awards</p>
                <p className="text-sm text-gray-600">Check for members eligible for automatic Joining In badges</p>
              </div>
              <Button
                onClick={handleCheckJoiningIn}
                disabled={checkingJoiningIn}
                variant="outline"
              >
                <Award className="w-4 h-4 mr-2" />
                {checkingJoiningIn ? 'Checking...' : 'Check Now'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 flex-wrap">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={badgeFilter} onValueChange={setBadgeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All badges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Badges</SelectItem>
                  {badges.map(badge => (
                    <SelectItem key={badge.id} value={badge.id}>
                      {badge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="only-due"
                  checked={onlyDue}
                  onCheckedChange={setOnlyDue}
                />
                <label htmlFor="only-due" className="text-sm font-medium cursor-pointer">
                  Only show due badges
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredAwards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No badges to award</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Badges Ready to Award</CardTitle>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedAwards.length === filteredAwards.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-3 w-12"></th>
                      <th className="text-left p-3">Member</th>
                      <th className="text-left p-3">Badge</th>
                      <th className="text-left p-3">Completed</th>
                      <th className="text-left p-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAwards.map(award => {
                      const member = members.find(m => m.id === award.member_id);
                      const badge = badges.find(b => b.id === award.badge_id);
                      const stockInfo = getStockInfo(award.badge_id);
                      const isSelected = selectedAwards.includes(award.id);

                      return (
                        <tr key={award.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAwards([...selectedAwards, award.id]);
                                } else {
                                  setSelectedAwards(selectedAwards.filter(id => id !== award.id));
                                }
                              }}
                            />
                          </td>
                          <td className="p-3">
                            <p className="font-medium">{member?.full_name}</p>
                            <p className="text-sm text-gray-500">
                              {sections.find(s => s.id === member?.section_id)?.display_name}
                            </p>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <img src={badge?.image_url} alt="" className="w-10 h-10 rounded" />
                              <div>
                                <p className="font-medium">{badge?.name}</p>
                                {badge?.category === 'staged' && badge?.stage_number && (
                                  <p className="text-xs text-gray-500">Stage {badge.stage_number}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {new Date(award.completed_date).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {stockInfo ? (
                              <div className="flex items-center gap-2">
                                <Package className={`w-4 h-4 ${
                                  stockInfo.current_stock === 0 ? 'text-red-500' :
                                  stockInfo.current_stock < stockInfo.minimum_threshold ? 'text-orange-500' :
                                  'text-green-500'
                                }`} />
                                <span className={
                                  stockInfo.current_stock === 0 ? 'text-red-600 font-medium' :
                                  stockInfo.current_stock < stockInfo.minimum_threshold ? 'text-orange-600' :
                                  'text-gray-900'
                                }>
                                  {stockInfo.current_stock} in stock
                                </span>
                                {stockInfo.current_stock === 0 && (
                                  <Badge variant="destructive" className="ml-2">Out of Stock</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">No stock tracking</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Stock Warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">The following badges have insufficient stock:</p>
            {confirmDialog?.stockIssues.map((issue, idx) => (
              <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="font-medium text-orange-900">{issue.badge}</p>
                <p className="text-sm text-orange-700">
                  Need {issue.needed}, but only {issue.available} in stock
                </p>
              </div>
            ))}
            {confirmDialog?.proceed ? (
              <p className="text-sm text-gray-600">
                As an admin, you can proceed with the award. Stock will go negative.
              </p>
            ) : (
              <p className="text-sm text-red-600">
                Cannot proceed. Please restock badges or contact an admin.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            {confirmDialog?.proceed && (
              <Button
                onClick={() => {
                  awardBadgesMutation.mutate(selectedAwards);
                  setConfirmDialog(null);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Proceed Anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualAwardDialog
        badge={manualAwardBadge}
        open={!!manualAwardBadge}
        onOpenChange={(open) => !open && setManualAwardBadge(null)}
      />
    </div>
  );
}