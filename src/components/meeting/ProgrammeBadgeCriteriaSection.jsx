import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, Plus, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ProgrammeBadgeCriteriaSection({ programmeId, entityType = 'programme' }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [selectedReqs, setSelectedReqs] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [countsAsHikeAway, setCountsAsHikeAway] = useState(false);

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: linkedCriteria = [] } = useQuery({
    queryKey: ['programme-criteria', programmeId, entityType],
    queryFn: async () => {
      const all = await base44.entities.ProgrammeBadgeCriteria.list();
      return all.filter(c => 
        entityType === 'event' ? c.event_id === programmeId : c.programme_id === programmeId
      );
    },
    enabled: !!programmeId,
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ['all-modules'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: allRequirements = [] } = useQuery({
    queryKey: ['all-requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const addCriteriaMutation = useMutation({
    mutationFn: (data) => {
      const criteriaData = entityType === 'event'
        ? { event_id: programmeId, ...data }
        : { programme_id: programmeId, ...data };
      return base44.entities.ProgrammeBadgeCriteria.create(criteriaData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programme-criteria'] });
      setShowDialog(false);
      setSelectedBadge(null);
      setSelectedReqs([]);
      setSelectedFamily(null);
      setCountsAsHikeAway(false);
      toast.success('Badge criteria added');
    },
  });

  const removeCriteriaMutation = useMutation({
    mutationFn: (id) => base44.entities.ProgrammeBadgeCriteria.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programme-criteria'] });
      toast.success('Criteria removed');
    },
  });

  const awardBadgesMutation = useMutation({
    mutationFn: async () => {
      const entityId = entityType === 'event' ? 'eventId' : 'programmeId';
      return base44.functions.invoke('awardBadgesToAttendees', {
        [entityId]: programmeId,
        entityType
      });
    },
    onSuccess: () => {
      toast.success('Badge requirements awarded to all attendees');
      queryClient.invalidateQueries({ queryKey: ['badge-progress'] });
      queryClient.invalidateQueries({ queryKey: ['member-badge-progress'] });
    },
    onError: (error) => {
      toast.error('Error awarding badges: ' + error.message);
    },
  });

  const handleAwardBadges = () => {
    if (window.confirm('Award all linked badge requirements to members marked as present?')) {
      awardBadgesMutation.mutate();
    }
  };

  const handleAddCriteria = () => {
    const badge = badges.find(b => b.id === selectedBadge);
    
    // For hikes away badges, no requirements needed
    if (badge?.badge_family_id === 'hikes_away') {
      addCriteriaMutation.mutate({
        badge_id: selectedBadge,
        requirement_ids: [],
        counts_as_hike_away: true,
      });
      return;
    }
    
    if (!selectedBadge || selectedReqs.length === 0) return;
    
    addCriteriaMutation.mutate({
      badge_id: selectedBadge,
      requirement_ids: selectedReqs,
      counts_as_hike_away: countsAsHikeAway,
    });
  };

  const filteredBadges = badges.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const badgeFamilies = badges
    .filter(b => b.category === 'staged' && b.badge_family_id)
    .reduce((acc, badge) => {
      if (!acc[badge.badge_family_id]) {
        acc[badge.badge_family_id] = [];
      }
      acc[badge.badge_family_id].push(badge);
      return acc;
    }, {});

  const nonStagedBadges = filteredBadges.filter(b => b.category !== 'staged');
  const stagedFamilies = Object.entries(badgeFamilies).filter(([familyId, stages]) =>
    stages.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getBadgeModules = (badgeId) => {
    return allModules.filter(m => m.badge_id === badgeId).sort((a, b) => a.order - b.order);
  };

  const getModuleRequirements = (moduleId) => {
    return allRequirements.filter(r => r.module_id === moduleId).sort((a, b) => a.order - b.order);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Badge Criteria
            </CardTitle>
            <div className="flex gap-2">
              {linkedCriteria.length > 0 && (
                <Button 
                  onClick={() => handleAwardBadges()} 
                  size="sm" 
                  variant="outline"
                  disabled={awardBadgesMutation.isPending}
                >
                  {awardBadgesMutation.isPending ? 'Awarding...' : 'Award to Attendees'}
                </Button>
              )}
              <Button onClick={() => setShowDialog(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Link Badge
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {linkedCriteria.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No badge criteria linked yet
            </p>
          ) : (
            <div className="space-y-3">
              {linkedCriteria.map(criteria => {
                const badge = badges.find(b => b.id === criteria.badge_id);
                const reqCount = criteria.requirement_ids?.length || 0;
                
                return (
                  <div key={criteria.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {badge?.image_url && (
                        <img src={badge.image_url} alt={badge.name} className="w-10 h-10 rounded" />
                      )}
                      <div>
                        <p className="font-medium">{badge?.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">{reqCount} requirement{reqCount !== 1 ? 's' : ''}</p>
                          {criteria.counts_as_hike_away && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              Counts as hike away
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCriteriaMutation.mutate(criteria.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Badge Criteria to Meeting</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search badges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {!selectedBadge && !selectedFamily ? (
              <div className="grid gap-2">
                {nonStagedBadges.map(badge => (
                  <div
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge.id)}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <img src={badge.image_url} alt={badge.name} className="w-12 h-12 rounded" />
                    <div className="flex-1">
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-sm text-gray-500">{badge.description}</p>
                    </div>
                  </div>
                ))}
                {stagedFamilies.map(([familyId, stages]) => {
                  const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);
                  const isHikesAway = familyId === 'hikes_away';
                  
                  return (
                    <div
                      key={familyId}
                      onClick={() => {
                        if (isHikesAway) {
                          setSelectedBadge(sortedStages[0].id);
                        } else {
                          setSelectedFamily(familyId);
                        }
                      }}
                      className="flex items-center gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100"
                    >
                      <img src={sortedStages[0].image_url} alt={sortedStages[0].name} className="w-12 h-12 rounded" />
                      <div className="flex-1">
                        <p className="font-medium">{sortedStages[0].name} {!isHikesAway && '(Staged)'}</p>
                        <p className="text-sm text-gray-500">
                          {isHikesAway ? 'Click to add hike away requirement' : `${sortedStages.length} stages available`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedFamily ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium">Select Stage</p>
                  <Button variant="ghost" onClick={() => {
                    setSelectedFamily(null);
                    setSelectedBadge(null);
                    setSelectedReqs([]);
                  }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {badgeFamilies[selectedFamily].sort((a, b) => a.stage_number - b.stage_number).map(badge => (
                    <div
                      key={badge.id}
                      onClick={() => {
                        setSelectedBadge(badge.id);
                        setSelectedFamily(null);
                      }}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    >
                      <img src={badge.image_url} alt={badge.name} className="w-12 h-12 rounded" />
                      <div className="flex-1">
                        <p className="font-medium">Stage {badge.stage_number}</p>
                        <p className="text-sm text-gray-500">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {(() => {
                  const badge = badges.find(b => b.id === selectedBadge);
                  const isHikesAway = badge?.badge_family_id === 'hikes_away';
                  
                  if (isHikesAway) {
                    return (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <img src={badge.image_url} alt="" className="w-12 h-12 rounded" />
                            <div>
                              <p className="font-medium">{badge.name}</p>
                              <p className="text-sm text-gray-500">Hikes Away Requirement</p>
                            </div>
                          </div>
                          <Button variant="ghost" onClick={() => {
                            setSelectedBadge(null);
                            setSelectedReqs([]);
                            setSelectedFamily(null);
                          }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-blue-900">
                            Adding this will count as a hike away for all attending members. Their hike counter will increment automatically.
                          </p>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddCriteria}>
                            Add Hike Away Requirement
                          </Button>
                        </div>
                      </>
                    );
                  }
                  
                  return (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <img src={badge?.image_url} alt="" className="w-12 h-12 rounded" />
                          <p className="font-medium">{badge?.name}</p>
                        </div>
                        <Button variant="ghost" onClick={() => {
                          setSelectedBadge(null);
                          setSelectedReqs([]);
                          setSelectedFamily(null);
                        }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {getBadgeModules(selectedBadge).map(module => {
                          const moduleReqs = getModuleRequirements(module.id);
                          return (
                            <div key={module.id} className="border rounded-lg p-4">
                              <h4 className="font-medium mb-3">{module.name}</h4>
                              <div className="space-y-2">
                                {moduleReqs.map((req, idx) => (
                                  <div key={req.id} className="flex items-start gap-2">
                                    <Checkbox
                                      id={req.id}
                                      checked={selectedReqs.includes(req.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedReqs([...selectedReqs, req.id]);
                                        } else {
                                          setSelectedReqs(selectedReqs.filter(id => id !== req.id));
                                        }
                                      }}
                                    />
                                    <label htmlFor={req.id} className="text-sm cursor-pointer flex-1">
                                      <span className="font-medium">{idx + 1}.</span> {req.text}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddCriteria}
                          disabled={selectedReqs.length === 0}
                        >
                          Add {selectedReqs.length} Requirement{selectedReqs.length !== 1 ? 's' : ''}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}