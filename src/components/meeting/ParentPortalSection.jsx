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
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ActionSummaryPanel from '@/components/actions/ActionSummaryPanel';

export default function ParentPortalSection({ programmeId, formData, setFormData }) {
  const queryClient = useQueryClient();
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionForm, setActionForm] = useState({
    action_text: '',
    column_title: '',
    action_purpose: '',
    dropdown_options: [''],
    deadline: '',
    volunteer_limit: '',
    volunteer_no_limit: false,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['action-required', programmeId],
    queryFn: () => base44.entities.ActionRequired.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const { data: programme } = useQuery({
    queryKey: ['programme', programmeId],
    queryFn: () => base44.entities.Programme.filter({ id: programmeId }).then(r => r[0]),
    enabled: !!programmeId,
  });

  const createActionMutation = useMutation({
    mutationFn: async (data) => {
      const actionData = { ...data, programme_id: programmeId, is_open: true };
      if (!actionData.deadline) delete actionData.deadline;
      if (actionData.action_purpose !== 'volunteer') {
        delete actionData.volunteer_limit;
        delete actionData.volunteer_no_limit;
      } else {
        actionData.volunteer_limit = actionData.volunteer_no_limit ? null : (parseInt(actionData.volunteer_limit) || null);
      }
      const action = await base44.entities.ActionRequired.create(actionData);

      // Immediately create ActionAssignment for all members in this section
      if (programme?.section_id) {
        const members = await base44.entities.Member.filter({ section_id: programme.section_id, active: true });
        const now = new Date().toISOString();
        await Promise.all(
          members.map(m =>
            base44.entities.ActionAssignment.create({
              action_required_id: action.id,
              member_id: m.id,
              assigned_at: now,
            })
          )
        );
      }

      await base44.functions.invoke('sendActionNotification', {
        actionRequiredId: action.id,
        entityType: 'programme',
        sendEmail: true,
        sendPush: true,
      });
      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      setShowActionDialog(false);
      setActionForm({ action_text: '', column_title: '', action_purpose: '', dropdown_options: [''], deadline: '', volunteer_limit: '', volunteer_no_limit: false });
      toast.success('Action required added — notifications sent');
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (id) => {
      const assignments = await base44.entities.ActionAssignment.filter({ action_required_id: id });
      const responses = await base44.entities.ActionResponse.filter({ action_required_id: id });
      await Promise.all([
        ...assignments.map(a => base44.entities.ActionAssignment.delete(a.id)),
        ...responses.map(r => base44.entities.ActionResponse.delete(r.id)),
        base44.entities.ActionRequired.delete(id),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      toast.success('Action deleted');
    },
  });

  const handleAddOption = () =>
    setActionForm({ ...actionForm, dropdown_options: [...actionForm.dropdown_options, ''] });

  const handleRemoveOption = (index) =>
    setActionForm({ ...actionForm, dropdown_options: actionForm.dropdown_options.filter((_, i) => i !== index) });

  const handleOptionChange = (index, value) => {
    const newOptions = [...actionForm.dropdown_options];
    newOptions[index] = value;
    setActionForm({ ...actionForm, dropdown_options: newOptions });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Meeting Information for Parents</CardTitle></CardHeader>
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
            <Label htmlFor="shown_in_portal" className="cursor-pointer">Show in parent portal</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Actions Required from Parents</CardTitle>
            <Button onClick={() => setShowActionDialog(true)} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />Add Action
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
                      {action.deadline && ' • Deadline set'}
                    </p>
                  </div>
                  <Button
                    size="sm" variant="ghost"
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

      {actions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Response Summary & Reminders</CardTitle></CardHeader>
          <CardContent>
            <ActionSummaryPanel actions={actions} entityType="programme" />
          </CardContent>
        </Card>
      )}

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Action Required</DialogTitle></DialogHeader>
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
              <Select value={actionForm.action_purpose} onValueChange={(value) => setActionForm({ ...actionForm, action_purpose: value })}>
                <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="consent">Consent</SelectItem>
                  <SelectItem value="custom_dropdown">Custom Dropdown</SelectItem>
                  <SelectItem value="text_input">Text Input</SelectItem>
                  <SelectItem value="volunteer">Volunteer Request</SelectItem>
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
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveOption(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button onClick={handleAddOption} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />Add Option
                </Button>
              </div>
            )}
            {actionForm.action_purpose === 'volunteer' && (
              <div className="space-y-3">
                <Label>Volunteers Needed</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="no-limit-mtg"
                    checked={actionForm.volunteer_no_limit}
                    onCheckedChange={(v) => setActionForm({ ...actionForm, volunteer_no_limit: v, volunteer_limit: '' })}
                  />
                  <label htmlFor="no-limit-mtg" className="text-sm cursor-pointer">No limit (anyone can volunteer)</label>
                </div>
                {!actionForm.volunteer_no_limit && (
                  <Input
                    type="number"
                    min="1"
                    value={actionForm.volunteer_limit}
                    onChange={(e) => setActionForm({ ...actionForm, volunteer_limit: e.target.value })}
                    placeholder="e.g. 3"
                  />
                )}
                <p className="text-xs text-gray-500">Once the limit is reached, the request disappears from parent dashboards.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <Input
                type="datetime-local"
                value={actionForm.deadline}
                onChange={(e) => setActionForm({ ...actionForm, deadline: e.target.value })}
              />
              <p className="text-xs text-gray-500">Once the deadline passes, this action automatically closes and disappears from parent dashboards.</p>
            </div>
            <Button
              onClick={() => createActionMutation.mutate(actionForm)}
              disabled={!actionForm.action_text || !actionForm.column_title || !actionForm.action_purpose || createActionMutation.isPending}
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