import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';

export default function EditBadgeStructure() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const badgeId = urlParams.get('id');

  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showReqDialog, setShowReqDialog] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({ name: '', completion_rule: 'all_required', required_count: 0 });
  const [reqForm, setReqForm] = useState({ text: '', notes: '', required_completions: 1 });

  const { data: badge } = useQuery({
    queryKey: ['badge', badgeId],
    queryFn: () => base44.entities.BadgeDefinition.filter({ id: badgeId }).then(res => res[0]),
    enabled: !!badgeId,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', badgeId],
    queryFn: () => base44.entities.BadgeModule.filter({ badge_id: badgeId }),
    enabled: !!badgeId,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements', badgeId],
    queryFn: () => base44.entities.BadgeRequirement.filter({ badge_id: badgeId }),
    enabled: !!badgeId,
  });

  const createModuleMutation = useMutation({
    mutationFn: (data) => base44.entities.BadgeModule.create({ ...data, badge_id: badgeId, order: modules.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setShowModuleDialog(false);
      setModuleForm({ name: '', completion_rule: 'all_required', required_count: 0 });
      toast.success('Module created');
    },
  });

  const createReqMutation = useMutation({
    mutationFn: (data) => {
      const moduleReqs = requirements.filter(r => r.module_id === selectedModule);
      return base44.entities.BadgeRequirement.create({
        ...data,
        badge_id: badgeId,
        module_id: selectedModule,
        order: moduleReqs.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      setShowReqDialog(false);
      setReqForm({ text: '', notes: '', required_completions: 1 });
      toast.success('Requirement added');
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (id) => base44.entities.BadgeModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Module deleted');
    },
  });

  const deleteReqMutation = useMutation({
    mutationFn: (id) => base44.entities.BadgeRequirement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requirement deleted');
    },
  });

  if (!badge) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('ManageBadges'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{badge.name} - Structure</h1>
              <p className="mt-1 text-white/80">Define modules and requirements</p>
            </div>
            <Button
              onClick={() => setShowModuleDialog(true)}
              className="bg-white text-[#7413dc] hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {modules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 mb-4">No modules yet. Add your first module to get started.</p>
              <Button onClick={() => setShowModuleDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Module
              </Button>
            </CardContent>
          </Card>
        ) : (
          modules.sort((a, b) => a.order - b.order).map(module => {
            const moduleReqs = requirements.filter(r => r.module_id === module.id).sort((a, b) => a.order - b.order);
            return (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                      <div>
                        <CardTitle>{module.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {module.completion_rule === 'all_required' 
                            ? 'Complete all requirements' 
                            : `Complete ${module.required_count} requirements`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedModule(module.id);
                          setShowReqDialog(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Requirement
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteModuleMutation.mutate(module.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {moduleReqs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No requirements yet</p>
                  ) : (
                    <div className="space-y-2">
                      {moduleReqs.map((req, idx) => (
                        <div
                          key={req.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-center w-6 h-6 bg-[#7413dc] text-white rounded-full text-xs font-medium flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{req.text}</p>
                            {req.required_completions > 1 && (
                              <p className="text-xs text-[#7413dc] font-medium mt-1">
                                Must complete {req.required_completions} times
                              </p>
                            )}
                            {req.notes && (
                              <p className="text-xs text-gray-500 mt-1">{req.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReqMutation.mutate(req.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Module Name</Label>
              <Input
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                placeholder="e.g., Outdoor Activities"
              />
            </div>
            <div>
              <Label>Completion Rule</Label>
              <Select
                value={moduleForm.completion_rule}
                onValueChange={(value) => setModuleForm({ ...moduleForm, completion_rule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_required">All Requirements Required</SelectItem>
                  <SelectItem value="x_of_n_required">X of N Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {moduleForm.completion_rule === 'x_of_n_required' && (
              <div>
                <Label>Required Count</Label>
                <Input
                  type="number"
                  min="1"
                  value={moduleForm.required_count}
                  onChange={(e) => setModuleForm({ ...moduleForm, required_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
            <Button onClick={() => createModuleMutation.mutate(moduleForm)}>Create Module</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReqDialog} onOpenChange={setShowReqDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Requirement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Requirement Text</Label>
              <Textarea
                value={reqForm.text}
                onChange={(e) => setReqForm({ ...reqForm, text: e.target.value })}
                placeholder="Describe what needs to be done..."
              />
            </div>
            <div>
              <Label>Required Completions</Label>
              <Input
                type="number"
                min="1"
                value={reqForm.required_completions}
                onChange={(e) => setReqForm({ ...reqForm, required_completions: parseInt(e.target.value) || 1 })}
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">How many times must this requirement be completed? (default: 1)</p>
            </div>
            <div>
              <Label>Leader Notes (Optional)</Label>
              <Textarea
                value={reqForm.notes}
                onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                placeholder="Additional notes for leaders..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReqDialog(false)}>Cancel</Button>
            <Button onClick={() => createReqMutation.mutate(reqForm)}>Add Requirement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}