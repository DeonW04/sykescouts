import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentPortalSection({ programmeId, formData, setFormData }) {
  const queryClient = useQueryClient();
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionForm, setActionForm] = useState({
    action_text: '',
    column_title: '',
    action_purpose: '',
    dropdown_options: [''],
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['action-required', programmeId],
    queryFn: () => base44.entities.ActionRequired.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const createActionMutation = useMutation({
    mutationFn: (data) => base44.entities.ActionRequired.create({ ...data, programme_id: programmeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      setShowActionDialog(false);
      setActionForm({ action_text: '', column_title: '', action_purpose: '', dropdown_options: [''] });
      toast.success('Action required added');
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: (id) => base44.entities.ActionRequired.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      toast.success('Action deleted');
    },
  });

  const handleAddOption = () => {
    setActionForm({
      ...actionForm,
      dropdown_options: [...actionForm.dropdown_options, ''],
    });
  };

  const handleRemoveOption = (index) => {
    const newOptions = actionForm.dropdown_options.filter((_, i) => i !== index);
    setActionForm({ ...actionForm, dropdown_options: newOptions });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...actionForm.dropdown_options];
    newOptions[index] = value;
    setActionForm({ ...actionForm, dropdown_options: newOptions });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meeting Information for Parents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meeting Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fire Safety & Outdoor Cooking"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will be covered in this meeting..."
              className="min-h-[100px]"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="shown_in_portal"
              checked={formData.shown_in_portal}
              onCheckedChange={(checked) => setFormData({ ...formData, shown_in_portal: checked })}
            />
            <Label htmlFor="shown_in_portal" className="cursor-pointer">
              Show in parent portal
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Actions Required from Parents</CardTitle>
            <Button onClick={() => setShowActionDialog(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No actions required yet</p>
          ) : (
            <div className="space-y-2">
              {actions.map(action => (
                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{action.action_text}</p>
                    <p className="text-sm text-gray-500">
                      Column: {action.column_title} • Type: {action.action_purpose}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteActionMutation.mutate(action.id)}
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

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Action Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Required Action *</Label>
              <Textarea
                value={actionForm.action_text}
                onChange={(e) => setActionForm({ ...actionForm, action_text: e.target.value })}
                placeholder="e.g., Please confirm attendance for next week's camp"
              />
            </div>
            <div className="space-y-2">
              <Label>Column Title *</Label>
              <Input
                value={actionForm.column_title}
                onChange={(e) => setActionForm({ ...actionForm, column_title: e.target.value })}
                placeholder="e.g., Camp Attendance"
              />
            </div>
            <div className="space-y-2">
              <Label>Action Purpose *</Label>
              <Select
                value={actionForm.action_purpose}
                onValueChange={(value) => setActionForm({ ...actionForm, action_purpose: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="consent">Consent</SelectItem>
                  <SelectItem value="custom_dropdown">Custom Dropdown</SelectItem>
                  <SelectItem value="text_input">Text Input</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionForm.action_purpose === 'custom_dropdown' && (
              <div className="space-y-2">
                <Label>Dropdown Options</Label>
                {actionForm.dropdown_options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {actionForm.dropdown_options.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button onClick={handleAddOption} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Option
                </Button>
              </div>
            )}

            <Button
              onClick={() => createActionMutation.mutate(actionForm)}
              disabled={!actionForm.action_text || !actionForm.column_title || !actionForm.action_purpose}
              className="w-full"
            >
              Add Action Required
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}