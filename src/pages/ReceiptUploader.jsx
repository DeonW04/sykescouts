import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Edit, X, Image, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import LeaderNav from '../components/leader/LeaderNav';

export default function ReceiptUploader() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [value, setValue] = useState('');
  const [isGeneric, setIsGeneric] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editReceipt, setEditReceipt] = useState(null);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: leader } = useQuery({
    queryKey: ['currentLeader', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      return leaders[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['myReceipts', leader?.id],
    queryFn: async () => {
      if (!leader?.id) return [];
      const receipts = await base44.entities.Receipt.filter({ leader_id: leader.id });
      return receipts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!leader?.id,
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({}),
  });

  const generateReceiptId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      if (!uploadFile) throw new Error('No file selected');
      if (!leader?.id) throw new Error('Leader information not found');
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      const receiptId = generateReceiptId();
      
      return base44.entities.Receipt.create({
        receipt_id: receiptId,
        receipt_image_url: file_url,
        value: parseFloat(data.value),
        meeting_id: data.meeting_id,
        is_generic_expense: data.is_generic,
        notes: data.notes,
        leader_id: leader.id,
        leader_name: leader.display_name || 'Admin',
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myReceipts']);
      toast.success('Receipt uploaded successfully');
      setShowUploadDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload receipt');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Receipt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myReceipts']);
      toast.success('Receipt updated');
      setEditReceipt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receipt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myReceipts']);
      toast.success('Receipt deleted');
      setEditReceipt(null);
    },
  });

  const resetForm = () => {
    setUploadFile(null);
    setValue('');
    setIsGeneric(false);
    setNotes('');
    setSelectedMeeting(null);
  };

  const handleUpload = () => {
    if (!uploadFile || !value) {
      toast.error('Please select a file and enter a value');
      return;
    }
    if (!isGeneric && !selectedMeeting) {
      toast.error('Please select a meeting or mark as generic expense');
      return;
    }
    uploadMutation.mutate({
      value,
      meeting_id: isGeneric ? null : selectedMeeting?.id,
      is_generic: isGeneric,
      notes,
    });
  };

  const handleUpdate = () => {
    updateMutation.mutate({
      id: editReceipt.id,
      data: {
        value: parseFloat(editReceipt.value),
        meeting_id: editReceipt.is_generic_expense ? null : editReceipt.meeting_id,
        is_generic_expense: editReceipt.is_generic_expense,
        notes: editReceipt.notes,
        receipt_id: editReceipt.receipt_id,
      },
    });
  };

  const filteredReceipts = receipts.filter((r) => {
    const term = searchTerm.toLowerCase();
    return r.receipt_id?.toLowerCase().includes(term) || r.notes?.toLowerCase().includes(term);
  });

  const getSectionName = (meeting) => {
    const section = sections.find((s) => s.id === meeting.section_id);
    return section?.display_name || '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-[#004851] text-white py-6 md:py-8 mb-6">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold">Receipt Uploader</h1>
          <p className="mt-1 text-white/80 text-sm md:text-base">Submit your expenses for reimbursement</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-6 pb-6">

        <Button onClick={() => setShowUploadDialog(true)} className="w-full mb-6 h-12 text-base">
          <Upload className="w-5 h-5 mr-2" />
          Upload Receipt
        </Button>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by ID or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Receipts List */}
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredReceipts.map((receipt) => (
              <Card key={receipt.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center">
                    <Badge variant="outline" className="font-mono text-xs">
                      {receipt.receipt_id}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImagePreview(receipt.receipt_image_url)}
                      className="justify-start px-2 h-8"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="text-xs">View</span>
                    </Button>
                    
                    <span className="font-semibold text-sm whitespace-nowrap">£{receipt.value.toFixed(2)}</span>
                    
                    <Badge variant={receipt.status === 'reimbursed' ? 'default' : 'secondary'} className="text-xs">
                      {receipt.status === 'reimbursed' ? 'Reimbursed' : 'Pending'}
                    </Badge>
                    
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {receipt.leader_name}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditReceipt({ ...receipt })}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredReceipts.length === 0 && (
              <div className="text-center py-8 text-gray-500">No receipts found</div>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Receipt Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Value (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generic"
                checked={isGeneric}
                onCheckedChange={setIsGeneric}
              />
              <Label htmlFor="generic">Generic Expense</Label>
            </div>
            {!isGeneric && (
              <div>
                <Label className="text-sm font-medium">Meeting</Label>
                <Popover open={meetingOpen} onOpenChange={setMeetingOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-1.5 h-10">
                      <span className="truncate">
                        {selectedMeeting
                          ? `${getSectionName(selectedMeeting)} - ${format(new Date(selectedMeeting.date), 'dd/MM/yyyy')}`
                          : 'Select meeting...'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search meetings..." />
                      <CommandList>
                        <CommandEmpty>No meetings found</CommandEmpty>
                        <CommandGroup>
                          {programmes.map((prog) => (
                            <CommandItem
                              key={prog.id}
                              onSelect={() => {
                                setSelectedMeeting(prog);
                                setMeetingOpen(false);
                              }}
                              className="text-sm"
                            >
                              {getSectionName(prog)} - {format(new Date(prog.date), 'dd/MM/yyyy')} - {prog.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information..."
                className="mt-1.5 min-h-20"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="w-full sm:w-auto">
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editReceipt && (
        <Dialog open={!!editReceipt} onOpenChange={() => setEditReceipt(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Receipt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Receipt ID</Label>
                <Input
                  value={editReceipt.receipt_id}
                  onChange={(e) =>
                    setEditReceipt({ ...editReceipt, receipt_id: e.target.value.slice(0, 4) })
                  }
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Value (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editReceipt.value}
                  onChange={(e) => setEditReceipt({ ...editReceipt, value: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-generic"
                  checked={editReceipt.is_generic_expense}
                  onCheckedChange={(checked) =>
                    setEditReceipt({ ...editReceipt, is_generic_expense: checked })
                  }
                />
                <Label htmlFor="edit-generic">Generic Expense</Label>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editReceipt.notes || ''}
                  onChange={(e) => setEditReceipt({ ...editReceipt, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(editReceipt.id)}
                className="w-full sm:w-auto"
              >
                Delete
              </Button>
              <Button variant="outline" onClick={() => setEditReceipt(null)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleUpdate} className="w-full sm:w-auto">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Preview Dialog */}
      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Receipt Image</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <img src={imagePreview} alt="Receipt" className="w-full h-auto rounded-lg" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}