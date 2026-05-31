/**
 * Manage Badges — embedded panel for AdminSettings.
 * Same logic as pages/ManageBadges but without FloatingNav / page header wrapper.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Award, Package, Search } from 'lucide-react';
import StockManagementDialog from '../badges/StockManagementDialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';

export default function ManageBadgesPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [formData, setFormData] = useState({
    name: '', section: 'scouts', category: 'activity', image_url: '',
    description: '', completion_rule: 'all_modules', badge_family_id: '',
    stage_number: null, uniform_position: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stockDialog, setStockDialog] = useState(null);

  const { data: badges = [] } = useQuery({ queryKey: ['badges'], queryFn: () => base44.entities.BadgeDefinition.filter({}) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });

  const createBadgeMutation = useMutation({
    mutationFn: async (data) => {
      const newBadge = await base44.entities.BadgeDefinition.create(data);
      await base44.entities.BadgeStock.create({ badge_id: newBadge.id, current_stock: 0, last_updated: new Date().toISOString() });
      return newBadge;
    },
    onSuccess: (newBadge) => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      setShowDialog(false); resetForm();
      toast.success('Badge created');
      if (newBadge.category === 'staged') navigate(createPageUrl('ManageStagedBadge') + `?familyId=${newBadge.badge_family_id}`);
    },
  });

  const updateBadgeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BadgeDefinition.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['badges'] }); setShowDialog(false); resetForm(); toast.success('Badge updated'); },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id) => base44.entities.BadgeDefinition.update(id, { active: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['badges'] }); toast.success('Badge deleted'); },
  });

  const resetForm = () => {
    setFormData({ name: '', section: 'scouts', category: 'activity', image_url: '', description: '', completion_rule: 'all_modules', badge_family_id: '', stage_number: null, uniform_position: '' });
    setEditingBadge(null);
  };

  const handleEdit = (badge) => {
    setEditingBadge(badge);
    setFormData({ name: badge.name, section: badge.section, category: badge.category || 'activity', image_url: badge.image_url, description: badge.description || '', completion_rule: badge.completion_rule, badge_family_id: badge.badge_family_id || '', stage_number: badge.stage_number || null, uniform_position: badge.uniform_position || '' });
    setShowDialog(true);
  };

  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) { toast.error('Please select a valid image file'); return; }
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
      toast.success('Image uploaded');
    } catch (error) { toast.error('Error: ' + error.message); }
    finally { setUploadingImage(false); }
  };

  const handleSubmit = () => {
    const submitData = { ...formData };
    if (submitData.category === 'staged') { submitData.section = 'all'; submitData.stage_number = null; }
    if (editingBadge) updateBadgeMutation.mutate({ id: editingBadge.id, data: submitData });
    else createBadgeMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search badges..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-gray-200 rounded-xl shadow-sm" />
        </div>
        <Button onClick={() => navigate(createPageUrl('BadgeStockManagement'))} variant="outline" className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white">
          <Package className="w-4 h-4 mr-2" />Manage Stock
        </Button>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
          <Plus className="w-4 h-4 mr-2" />New Badge
        </Button>
      </div>

      {/* Badge grid */}
      {['challenge', 'activity', 'staged', 'core'].map(category => {
        const categoryBadges = badges.filter(b => b.active && b.category === category && b.name.toLowerCase().includes(searchTerm.toLowerCase()));
        let displayBadges;
        if (category === 'staged') {
          const familyBadges = categoryBadges.filter(b => b.stage_number === null);
          const allActivityBadges = badges.filter(b => b.active && b.category === 'activity' && b.name.toLowerCase().includes(searchTerm.toLowerCase()));
          const joiningInBadges = allActivityBadges.filter(b => b.name.toLowerCase().includes('joining in award'));
          const joiningInPlaceholder = joiningInBadges.length > 0 ? [{ id: 'joining-in-awards', name: 'Joining In Awards', section: 'all', category: 'staged', image_url: joiningInBadges[0].image_url, description: `Manage all ${joiningInBadges.length} Joining In Award stages`, isJoiningInPlaceholder: true }] : [];
          const specialNames = ['nights away', 'hikes away', 'joining in'];
          const regularFamilies = familyBadges.filter(b => !specialNames.some(n => b.name.toLowerCase().includes(n))).sort((a, b) => a.name.localeCompare(b.name));
          const nightsFam = familyBadges.find(b => b.name.toLowerCase().includes('nights away'));
          const hikesFam = familyBadges.find(b => b.name.toLowerCase().includes('hikes away'));
          displayBadges = [...regularFamilies, ...(nightsFam ? [nightsFam] : []), ...(hikesFam ? [hikesFam] : []), ...joiningInPlaceholder];
        } else if (category === 'activity') {
          displayBadges = categoryBadges.filter(b => !b.name.toLowerCase().includes('joining in award')).sort((a, b) => a.name.localeCompare(b.name));
        } else if (category === 'core') {
          displayBadges = categoryBadges.filter(b => !b.name.toLowerCase().includes('joining in award')).sort((a, b) => a.name.localeCompare(b.name));
        } else if (category === 'challenge') {
          displayBadges = [...categoryBadges].sort((a, b) => { if (a.is_chief_scout_award) return -1; if (b.is_chief_scout_award) return 1; return a.name.localeCompare(b.name); });
        } else {
          displayBadges = [...categoryBadges].sort((a, b) => a.name.localeCompare(b.name));
        }
        if (displayBadges.length === 0) return null;
        return (
          <div key={category}>
            <h2 className="text-base font-bold text-gray-900 mb-3 capitalize flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#7413dc] inline-block" />
              {category} Badges
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayBadges.map(badge => {
                const isStaged = badge.category === 'staged';
                const isJoiningIn = badge.isJoiningInPlaceholder;
                const familyBadges = isStaged ? categoryBadges.filter(b => b.badge_family_id === badge.badge_family_id && b.stage_number !== null) : [badge];
                return (
                  <div key={badge.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 flex items-start gap-3 border-b border-gray-50">
                      <img src={badge.image_url} alt={badge.name} className="w-14 h-14 rounded-xl object-contain bg-gray-50 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{badge.name}{isStaged && <span className="text-xs font-normal text-gray-400 ml-1">({familyBadges.length} stages)</span>}</p>
                        <p className="text-xs text-[#7413dc] font-medium mt-0.5">{isStaged ? 'All Sections' : (sections.find(s => s.name === badge.section)?.display_name || badge.section)}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{badge.description}</p>
                      {isJoiningIn ? (
                        <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl('JoiningInBadgeDetail'))}><Edit className="w-4 h-4 mr-2" />Manage All Stages</Button>
                      ) : isStaged ? (
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl('ManageStagedBadge') + `?familyId=${badge.badge_family_id}`)}><Edit className="w-4 h-4 mr-2" />Manage Stages</Button>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(badge)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                            <Button variant="outline" size="sm" onClick={() => deleteBadgeMutation.mutate(badge.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('EditBadgeStructure') + `?id=${badge.id}`)}><Edit className="w-3 h-3 mr-1" />Structure</Button>
                          <Button variant="outline" size="sm" onClick={() => setStockDialog(badge)}><Package className="w-3 h-3 mr-1" />Stock</Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(badge)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => deleteBadgeMutation.mutate(badge.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* New / Edit badge dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBadge ? 'Edit Badge' : 'Create New Badge'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Badge Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Adventure Challenge" /></div>
            {formData.category !== 'staged' && (
              <>
                <div><Label>Section</Label>
                  <Select value={formData.section} onValueChange={(value) => setFormData({ ...formData, section: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sections.map(section => (<SelectItem key={section.id} value={section.name}>{section.display_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Badge description..." /></div>
                <div><Label>Completion Rule</Label>
                  <Select value={formData.completion_rule} onValueChange={(value) => setFormData({ ...formData, completion_rule: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_modules">Complete All Modules</SelectItem>
                      <SelectItem value="one_module">Complete One Module</SelectItem>
                      <SelectItem value="custom">Custom Rule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {formData.category === 'staged' && (
              <div><Label>Badge Family ID</Label>
                <Input value={formData.badge_family_id} onChange={(e) => setFormData({ ...formData, badge_family_id: e.target.value })} placeholder="e.g., hikes-away" />
                <p className="text-xs text-gray-500 mt-1">Unique ID for this staged badge family. You'll add individual stages on the next page.</p>
              </div>
            )}
            <div><Label>Uniform Position</Label>
              <Select value={formData.uniform_position || '__none__'} onValueChange={(v) => setFormData({ ...formData, uniform_position: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select position on uniform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="left_sleeve_upper">Left Sleeve (Upper)</SelectItem>
                  <SelectItem value="left_sleeve_lower">Left Sleeve (Lower)</SelectItem>
                  <SelectItem value="right_sleeve">Right Sleeve</SelectItem>
                  <SelectItem value="left_chest_upper">Left Chest (Upper)</SelectItem>
                  <SelectItem value="left_chest_lower">Left Chest (Lower)</SelectItem>
                  <SelectItem value="right_chest_upper">Right Chest (Upper)</SelectItem>
                  <SelectItem value="right_chest_lower">Right Chest (Lower)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Badge Image (JPG/PNG)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0])} disabled={uploadingImage} />
              {formData.image_url && <img src={formData.image_url} alt="Preview" className="w-20 h-20 mt-2 rounded border" />}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingBadge ? 'Save Changes' : 'Create Badge'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockManagementDialog badge={stockDialog} open={!!stockDialog} onClose={() => setStockDialog(null)} />
    </div>
  );
}