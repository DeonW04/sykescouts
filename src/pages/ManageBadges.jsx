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
import { ArrowLeft, Plus, Edit, Trash2, Award, Package } from 'lucide-react';
import StockManagementDialog from '../components/badges/StockManagementDialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ManageBadges() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    section: 'cubs',
    category: 'activity',
    image_url: '',
    description: '',
    completion_rule: 'all_modules',
    badge_family_id: '',
    stage_number: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stockDialog, setStockDialog] = useState(null);

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const createBadgeMutation = useMutation({
    mutationFn: (data) => base44.entities.BadgeDefinition.create(data),
    onSuccess: (newBadge) => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setShowDialog(false);
      resetForm();
      toast.success('Badge created successfully');
      
      // If staged badge, redirect to manage page
      if (newBadge.category === 'staged') {
        navigate(createPageUrl('ManageStagedBadge') + `?familyId=${newBadge.badge_family_id}`);
      }
    },
  });

  const updateBadgeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BadgeDefinition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      setShowDialog(false);
      resetForm();
      toast.success('Badge updated successfully');
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: (id) => base44.entities.BadgeDefinition.update(id, { active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      toast.success('Badge deleted successfully');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      section: 'cubs',
      category: 'activity',
      image_url: '',
      description: '',
      completion_rule: 'all_modules',
      badge_family_id: '',
      stage_number: null,
    });
    setEditingBadge(null);
  };

  const handleEdit = (badge) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      section: badge.section,
      category: badge.category || 'activity',
      image_url: badge.image_url,
      description: badge.description || '',
      completion_rule: badge.completion_rule,
      badge_family_id: badge.badge_family_id || '',
      stage_number: badge.stage_number || null,
    });
    setShowDialog(true);
  };

  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Error uploading image: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    const submitData = { ...formData };
    
    // For staged badges, set section to 'all' and remove stage_number
    if (submitData.category === 'staged') {
      submitData.section = 'all';
      submitData.stage_number = null;
    }
    
    if (editingBadge) {
      updateBadgeMutation.mutate({ id: editingBadge.id, data: submitData });
    } else {
      createBadgeMutation.mutate(submitData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-3xl font-bold">Manage Badges</h1>
                <p className="mt-1 text-white/80">Create and configure badges</p>
              </div>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              className="bg-white text-[#7413dc] hover:bg-gray-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Badge
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {['challenge', 'activity', 'staged', 'core'].map(category => {
          const categoryBadges = badges.filter(b => b.active && b.category === category);
          if (categoryBadges.length === 0) return null;
          
          // For staged badges, group by family
          const displayBadges = category === 'staged' 
            ? Object.values(categoryBadges.reduce((acc, badge) => {
                const familyId = badge.badge_family_id || badge.id;
                if (!acc[familyId]) {
                  acc[familyId] = badge;
                }
                return acc;
              }, {}))
            : categoryBadges;
          
          return (
            <div key={category} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 capitalize">{category} Badges</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayBadges.map(badge => {
                  const isStaged = badge.category === 'staged';
                  const familyBadges = isStaged ? categoryBadges.filter(b => b.badge_family_id === badge.badge_family_id) : [badge];
                  
                  return (
            <Card key={badge.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <img
                    src={badge.image_url}
                    alt={badge.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {badge.name}
                      {isStaged && (
                        <span className="text-sm font-normal text-gray-500"> ({familyBadges.length} stages)</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {isStaged ? 'All Sections' : (sections.find(s => s.name === badge.section)?.display_name || badge.section)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{badge.description}</p>
                {isStaged ? (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(createPageUrl('ManageStagedBadge') + `?familyId=${badge.badge_family_id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Manage Stages
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(badge)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBadgeMutation.mutate(badge.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(createPageUrl('EditBadgeStructure') + `?id=${badge.id}`)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Structure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockDialog(badge)}
                    >
                      <Package className="w-3 h-3 mr-1" />
                      Stock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(badge)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBadgeMutation.mutate(badge.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBadge ? 'Edit Badge' : 'Create New Badge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Badge Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Adventure Challenge"
              />
            </div>
            <div>
              <Label>Section</Label>
              <Select
                value={formData.section}
                onValueChange={(value) => setFormData({ ...formData, section: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.name}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="challenge">Challenge</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="staged">Staged</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.category === 'staged' && (
              <div>
                <Label>Badge Family ID</Label>
                <Input
                  value={formData.badge_family_id}
                  onChange={(e) => setFormData({ ...formData, badge_family_id: e.target.value })}
                  placeholder="e.g., hikes-away"
                />
                <p className="text-xs text-gray-500 mt-1">Unique ID for this staged badge family. You'll add individual stages on the next page.</p>
              </div>
            )}
            <div>
              <Label>Badge Image (JPG/PNG)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files[0])}
                disabled={uploadingImage}
              />
              {formData.image_url && (
                <img src={formData.image_url} alt="Preview" className="w-20 h-20 mt-2 rounded border" />
              )}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Badge description..."
              />
            </div>
            <div>
              <Label>Completion Rule</Label>
              <Select
                value={formData.completion_rule}
                onValueChange={(value) => setFormData({ ...formData, completion_rule: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_modules">Complete All Modules</SelectItem>
                  <SelectItem value="one_module">Complete One Module</SelectItem>
                  <SelectItem value="custom">Custom Rule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingBadge ? 'Save Changes' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockManagementDialog
        badge={stockDialog}
        open={!!stockDialog}
        onClose={() => setStockDialog(null)}
      />
    </div>
  );
}