import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSectionContext } from '../components/leader/SectionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, AlertTriangle, CheckCircle, Package, Star, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import ManualAwardDialog from '../components/badges/ManualAwardDialog';

export default function AwardBadges() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const { selectedSection } = useSectionContext();
  const [sectionFilter, setSectionFilter] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [onlyDue, setOnlyDue] = useState(true);
  const [selectedAwards, setSelectedAwards] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [manualAwardBadge, setManualAwardBadge] = useState(null);
  const [checkingJoiningIn, setCheckingJoiningIn] = useState(false);
  const [awardingDialog, setAwardingDialog] = useState(false); // 'loading' | 'success' | false
  const [awardingProgress, setAwardingProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    loadUser();
  }, []);

  // Sync section dropdown to global selected section
  useEffect(() => {
    if (selectedSection) {
      setSectionFilter(selectedSection);
    }
  }, [selectedSection]);

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
      // Initialise progress
      setAwardingProgress({ current: 0, total: awardIds.length });

      const results = [];
      for (const [index, awardId] of awardIds.entries()) {
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
        // Update progress after each award completes
        setAwardingProgress({ current: index + 1, total: awardIds.length });
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      setSelectedAwards([]);
      setAwardingDialog('success');
      setTimeout(() => {
        setAwardingDialog(false);
        setAwardingProgress({ current: 0, total: 0 });
      }, 2000);
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
      setAwardingDialog('loading');
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

  const progressPct = awardingProgress.total > 0
    ? Math.round((awardingProgress.current / awardingProgress.total) * 100)
    : 0;

  const manualBadges = badges.filter(b => b.completion_rule === 'manual' && b.category === 'special');

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Award Badges</h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Award completed badges to members</p>
          </div>
          {selectedAwards.length > 0 && (
            <Button onClick={handleAwardSelected} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Award {selectedAwards.length} Badge{selectedAwards.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Manual Award Section */}
        {manualBadges.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-50 rounded-xl flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Manual Awards</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {manualBadges.map(badge => (
                <button
                  key={badge.id}
                  onClick={() => setManualAwardBadge(badge)}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 hover:shadow-sm transition-all border border-transparent hover:border-purple-100"
                >
                  <img src={badge.image_url} alt={badge.name} className="w-16 h-16 object-contain" />
                  <p className="text-sm font-medium text-center text-gray-700">{badge.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Joining In Check */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-gray-900">Joining In Awards</p>
            <p className="text-sm text-gray-500 mt-0.5">Check for members eligible for automatic Joining In badges</p>
          </div>
          <Button onClick={handleCheckJoiningIn} disabled={checkingJoiningIn} variant="outline" className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white">
            <Award className="w-4 h-4 mr-2" />
            {checkingJoiningIn ? 'Checking...' : 'Check Now'}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex gap-3 flex-wrap items-center">
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-44 bg-gray-50 border-gray-200">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(section => (
                <SelectItem key={section.id} value={section.id}>{section.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={badgeFilter} onValueChange={setBadgeFilter}>
            <SelectTrigger className="w-44 bg-gray-50 border-gray-200">
              <SelectValue placeholder="All badges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Badges</SelectItem>
              {badges.map(badge => (
                <SelectItem key={badge.id} value={badge.id}>{badge.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Checkbox id="only-due" checked={onlyDue} onCheckedChange={setOnlyDue} />
            <label htmlFor="only-due" className="text-sm font-medium cursor-pointer text-gray-700">Only show due badges</label>
          </div>
        </div>

        {filteredAwards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No badges to award</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Badges Ready to Award</h3>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedAwards.length === filteredAwards.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[55vh]">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 w-12 text-xs text-gray-500 font-medium"></th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Member</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Badge</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Completed</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAwards.map(award => {
                    const member = members.find(m => m.id === award.member_id);
                    const badge = badges.find(b => b.id === award.badge_id);
                    const stockInfo = getStockInfo(award.badge_id);
                    const isSelected = selectedAwards.includes(award.id);

                    return (
                      <tr key={award.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}>
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedAwards([...selectedAwards, award.id]);
                              else setSelectedAwards(selectedAwards.filter(id => id !== award.id));
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {member?.full_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{member?.full_name}</p>
                              <p className="text-xs text-gray-500">{sections.find(s => s.id === member?.section_id)?.display_name}</p>
                              {!member?.osm_scoutid && <p className="text-xs text-amber-600">⚠ Not linked to OSM</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img src={badge?.image_url} alt="" className="w-9 h-9 rounded-lg object-contain bg-gray-50" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{badge?.name}</p>
                              {badge?.category === 'staged' && badge?.stage_number && (
                                <p className="text-xs text-gray-500">Stage {badge.stage_number}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(award.completed_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          {stockInfo ? (
                            <div className="flex items-center gap-1.5">
                              <Package className={`w-4 h-4 ${stockInfo.current_stock === 0 ? 'text-red-500' : stockInfo.current_stock < stockInfo.minimum_threshold ? 'text-orange-500' : 'text-green-500'}`} />
                              <span className={`text-sm ${stockInfo.current_stock === 0 ? 'text-red-600 font-medium' : stockInfo.current_stock < stockInfo.minimum_threshold ? 'text-orange-600' : 'text-gray-700'}`}>
                                {stockInfo.current_stock}
                              </span>
                              {stockInfo.current_stock === 0 && <Badge variant="destructive" className="text-xs">Out</Badge>}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  setConfirmDialog(null);
                  setAwardingDialog('loading');
                  awardBadgesMutation.mutate(selectedAwards);
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Proceed Anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Awarding progress dialog */}
      <Dialog open={!!awardingDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-6 py-8">
            <AnimatePresence mode="wait">
              {awardingDialog === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
                    <Loader2 className="w-10 h-10 text-[#7413dc] animate-spin" />
                  </div>
                  <div className="w-full">
                    <p className="text-lg font-semibold text-gray-900">Awarding Badges...</p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">
                      {awardingProgress.current} of {awardingProgress.total}
                    </p>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-[#7413dc] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{progressPct}%</p>
                  </div>
                </motion.div>
              )}
              {awardingDialog === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                    >
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </motion.div>
                  </motion.div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Badges Awarded!</p>
                    <p className="text-sm text-gray-500 mt-1">All done successfully</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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