import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Award, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import StockManagementDialog from '../components/badges/StockManagementDialog';

export default function ManageStagedBadge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const familyId = urlParams.get('familyId');
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [formData, setFormData] = useState({
    stage_number: null,
    image_url: '',
    description: '',
    completion_rule: 'all_modules',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stockDialog, setStockDialog] = useState(null);

  const { data: allBadges = [], isLoading } = useQuery({
    queryKey: ['staged-badges', familyId],
    queryFn: () => base44.entities.BadgeDefinition.filter({ 
      badge_family_id: familyId,
      active: true 
    }),
    enabled: !!familyId,
  });

  // Separate family badge from actual stages
  const familyBadge = allBadges.find(b => b.stage_number === null);
  const stages = allBadges.filter(b => b.stage_number !== null);

  const createStageMutation = useMutation({
    mutationFn: async (data) => {
      const newStage = await base44.entities.BadgeDefinition.create({
        ...data,
        name: `${familyBadge?.name} - Stage ${data.stage_number}`,
        badge_family_id: familyId,
        section: 'all',
        category: 'staged',
      });
      
      // Create stock entry with 0 stock
      await base44.entities.BadgeStock.create({
        badge_id: newStage.id,
        current_stock: 0,
        last_updated: new Date().toISOString(),
      });
      
      return newStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staged-badges', familyId] });
      queryClient.invalidateQueries({ queryKey: ['badge-stock'] });
      setShowDialog(false);
      resetForm();
      toast.success('Stage added successfully');
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BadgeDefinition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staged-badges', familyId] });
      setShowDialog(false);
      resetForm();
      toast.success('Stage updated successfully');
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id) => base44.entities.BadgeDefinition.update(id, { active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staged-badges', familyId] });
      toast.success('Stage deleted successfully');
    },
  });

  const resetForm = () => {
    setFormData({
      stage_number: null,
      image_url: '',
      description: '',
      completion_rule: 'all_modules',
    });
    setEditingStage(null);
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setFormData({
      stage_number: stage.stage_number,
      image_url: stage.image_url,
      description: stage.description || '',
      completion_rule: stage.completion_rule,
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
    if (editingStage) {
      updateStageMutation.mutate({ id: editingStage.id, data: formData });
    } else {
      createStageMutation.mutate(formData);
    }
  };

  if (!familyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No family ID provided</p>
          <Button onClick={() => navigate(createPageUrl('ManageBadges'))}>
            Back to Badges
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const sortedStages = [...stages].sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('ManageBadges'))}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Manage Badges
          </Button>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">{familyBadge?.name || 'Staged Badge'}</h1>
                <p className="mt-1 text-white/80">Manage individual stages</p>
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
              Add Stage
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sortedStages.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No stages added yet</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowDialog(true);
                }}
                className="bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Stage
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedStages.map(stage => (
              <Card key={stage.id}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <img
                      src={stage.image_url}
                      alt={`Stage ${stage.stage_number}`}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Stage {stage.stage_number}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">All Sections</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{stage.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(createPageUrl('EditBadgeStructure') + `?id=${stage.id}`)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Structure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStockDialog(stage)}
                    >
                      <Package className="w-3 h-3 mr-1" />
                      Stock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(stage)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStageMutation.mutate(stage.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Stage Number</Label>
              <Input
                type="number"
                min="1"
                value={formData.stage_number || ''}
                onChange={(e) => setFormData({ ...formData, stage_number: parseInt(e.target.value) || null })}
                placeholder="1, 2, 3..."
              />
            </div>
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
                placeholder="Stage description..."
              />
            </div>
            <div>
              <Label>Completion Rule</Label>
              <select
                value={formData.completion_rule}
                onChange={(e) => setFormData({ ...formData, completion_rule: e.target.value })}
                className="w-full border rounded-md p-2"
              >
                <option value="all_modules">Complete All Modules</option>
                <option value="one_module">Complete One Module</option>
                <option value="custom">Custom Rule</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingStage ? 'Save Changes' : 'Add Stage'}
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