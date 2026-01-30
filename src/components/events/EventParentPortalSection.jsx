import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Trash2, Download, Plus, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

export default function EventParentPortalSection({ eventId, event }) {
  const queryClient = useQueryClient();
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [actionForm, setActionForm] = useState({
    action_text: '',
    column_title: '',
    action_purpose: '',
    dropdown_options: [''],
  });

  const documents = event?.documents || [];

  const { data: actions = [] } = useQuery({
    queryKey: ['action-required', eventId],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const updateEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event'] });
      toast.success('Event updated');
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async (data) => {
      const action = await base44.entities.ActionRequired.create({ ...data, event_id: eventId });
      // Send email notifications
      await base44.functions.invoke('sendActionRequiredEmail', {
        actionRequiredId: action.id,
        entityType: 'event'
      });
      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      setShowActionDialog(false);
      setActionForm({ action_text: '', column_title: '', action_purpose: '', dropdown_options: [''] });
      toast.success('Action required added and emails sent');
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: (id) => base44.entities.ActionRequired.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      toast.success('Action deleted');
    },
  });

  const toggleActionOpenMutation = useMutation({
    mutationFn: async ({ id, is_open }) => {
      return base44.entities.ActionRequired.update(id, { is_open });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      toast.success('Action status updated');
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ActionRequired.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-required'] });
      toast.success('Action updated');
    },
  });

  const handleUploadDocument = async () => {
    if (!docFile || !docName) {
      toast.error('Please provide a name and select a file');
      return;
    }

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: docFile });
      
      const updatedDocs = [...documents, { name: docName, url: file_url }];
      await updateEventMutation.mutateAsync({ documents: updatedDocs });
      
      setShowUploadDialog(false);
      setDocName('');
      setDocFile(null);
      toast.success('Document uploaded');
    } catch (error) {
      toast.error('Error uploading document: ' + error.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docUrl) => {
    const updatedDocs = documents.filter(d => d.url !== docUrl);
    await updateEventMutation.mutateAsync({ documents: updatedDocs });
    toast.success('Document removed');
  };

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
          <div className="flex items-center justify-between">
            <CardTitle>Documents for Parents</CardTitle>
            <Button onClick={() => setShowUploadDialog(true)} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Upload documents (kit lists, information sheets, etc.) that parents can view when they access this event.
          </p>
          
          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No documents uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.url)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          <p className="text-sm text-gray-600 mb-4">
            Schedule reminder emails for parents with attending children
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await base44.functions.invoke('sendEventReminder', { eventId });
                toast.success('Reminder emails sent');
              } catch (error) {
                toast.error('Failed to send reminders: ' + error.message);
              }
            }}
            className="mb-4"
          >
            Send Reminder Now
          </Button>
        </CardContent>
        <CardHeader>
          <CardTitle>Action Required</CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No actions required yet</p>
          ) : (
            <div className="space-y-2">
              {actions.map(action => (
                <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{action.action_text}</p>
                      {action.is_open === false && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Closed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Column: {action.column_title} • Type: {action.action_purpose}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingAction(action);
                        setActionForm({
                          action_text: action.action_text,
                          column_title: action.column_title,
                          action_purpose: action.action_purpose,
                          dropdown_options: action.dropdown_options || [''],
                        });
                        setShowEditDialog(true);
                      }}
                      title="Edit action"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActionOpenMutation.mutate({ 
                        id: action.id, 
                        is_open: action.is_open === false 
                      })}
                      title={action.is_open === false ? 'Open responses' : 'Close responses'}
                    >
                      {action.is_open === false ? (
                        <Unlock className="w-4 h-4 text-green-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-600" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteActionMutation.mutate(action.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docName">Document Name</Label>
              <Input
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., Kit List, Information Sheet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docFile">File</Label>
              <Input
                id="docFile"
                type="file"
                onChange={(e) => setDocFile(e.target.files[0])}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={uploadingDoc}>
              {uploadingDoc ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                placeholder="e.g., Please confirm attendance for the camp"
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Action Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Required Action *</Label>
              <Textarea
                value={actionForm.action_text}
                onChange={(e) => setActionForm({ ...actionForm, action_text: e.target.value })}
                placeholder="e.g., Please confirm attendance for the camp"
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
              onClick={() => {
                if (editingAction) {
                  updateActionMutation.mutate({
                    id: editingAction.id,
                    data: actionForm
                  });
                  setShowEditDialog(false);
                  setEditingAction(null);
                }
              }}
              disabled={!actionForm.action_text || !actionForm.column_title || !actionForm.action_purpose}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}