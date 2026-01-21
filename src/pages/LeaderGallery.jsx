import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import PhotoGallery from '../components/events/PhotoGallery';
import { format } from 'date-fns';

export default function LeaderGallery() {
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadForm, setUploadForm] = useState({
    link_type: 'event',
    event_id: '',
    programme_id: '',
    manual_event_name: '',
    section_id: '',
    caption: '',
    visible_to: 'parents',
    is_public: false,
  });
  const [filterSection, setFilterSection] = useState('all');

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date'),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.list('-date'),
  });

  const { data: allPhotos = [], isLoading } = useQuery({
    queryKey: ['all-photos'],
    queryFn: () => base44.entities.EventPhoto.list('-created_date'),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId) => base44.entities.EventPhoto.delete(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-photos']);
      toast.success('Photo deleted');
    },
  });

  const filteredPhotos = filterSection === 'all' 
    ? allPhotos 
    : allPhotos.filter(p => p.section_id === filterSection);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid image type`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setShowUploadDialog(true);
    }
  };

  const handleLinkTypeChange = (type) => {
    setUploadForm({
      ...uploadForm,
      link_type: type,
      event_id: '',
      programme_id: '',
      manual_event_name: '',
      section_id: '',
    });
  };

  const handleEventChange = (eventId) => {
    const event = events.find(e => e.id === eventId);
    setUploadForm({
      ...uploadForm,
      event_id: eventId,
      section_id: event?.section_ids?.[0] || '',
    });
  };

  const handleProgrammeChange = (programmeId) => {
    const programme = programmes.find(p => p.id === programmeId);
    setUploadForm({
      ...uploadForm,
      programme_id: programmeId,
      section_id: programme?.section_id || '',
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) return;

    if (!uploadForm.section_id) {
      toast.error('Please select a section');
      return;
    }

    if (uploadForm.link_type === 'manual' && !uploadForm.manual_event_name) {
      toast.error('Please enter an event name');
      return;
    }

    if (uploadForm.link_type === 'event' && !uploadForm.event_id) {
      toast.error('Please select an event');
      return;
    }

    if (uploadForm.link_type === 'programme' && !uploadForm.programme_id) {
      toast.error('Please select a programme');
      return;
    }

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        await base44.entities.EventPhoto.create({
          event_id: uploadForm.link_type === 'event' ? uploadForm.event_id : undefined,
          programme_id: uploadForm.link_type === 'programme' ? uploadForm.programme_id : undefined,
          manual_event_name: uploadForm.link_type === 'manual' ? uploadForm.manual_event_name : undefined,
          section_id: uploadForm.section_id,
          file_url,
          caption: uploadForm.caption,
          visible_to: uploadForm.visible_to,
          is_public: uploadForm.is_public,
          uploaded_by: user.id,
        });
      }

      queryClient.invalidateQueries(['all-photos']);
      toast.success(`${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`);
      setShowUploadDialog(false);
      setSelectedFiles([]);
      setUploadForm({
        link_type: 'event',
        event_id: '',
        programme_id: '',
        manual_event_name: '',
        section_id: '',
        caption: '',
        visible_to: 'parents',
        is_public: false,
      });
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getPhotoLabel = (photo) => {
    if (photo.event_id) {
      const event = events.find(e => e.id === photo.event_id);
      return event?.title || 'Event';
    }
    if (photo.programme_id) {
      const programme = programmes.find(p => p.id === photo.programme_id);
      return programme?.title || 'Meeting';
    }
    return photo.manual_event_name || 'Untitled';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Photo Gallery</h1>
          <p className="mt-2 text-purple-100">Upload and manage event photos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upload Photos</CardTitle>
            <div>
              <input
                type="file"
                id="photo-upload"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button asChild>
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photos
                </label>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="mb-6">
          <Label>Filter by Section</Label>
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(section => (
                <SelectItem key={section.id} value={section.id}>
                  {section.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No photos uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.file_url}
                    alt={photo.caption || ''}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-2 text-white text-xs">
                    <p className="font-medium mb-1">{getPhotoLabel(photo)}</p>
                    {photo.caption && <p className="text-center mb-2">{photo.caption}</p>}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deletePhotoMutation.mutate(photo.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload {selectedFiles.length} Photo{selectedFiles.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {selectedFiles.slice(0, 4).map((file, idx) => (
                <img
                  key={idx}
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${idx + 1}`}
                  className="w-full aspect-square object-cover rounded border"
                />
              ))}
              {selectedFiles.length > 4 && (
                <div className="w-full aspect-square bg-gray-100 rounded border flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">+ {selectedFiles.length - 4} more</span>
                </div>
              )}
            </div>

            <div>
              <Label>Link To</Label>
              <Select value={uploadForm.link_type} onValueChange={handleLinkTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="programme">Programme Meeting</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {uploadForm.link_type === 'event' && (
              <div>
                <Label>Select Event</Label>
                <Select value={uploadForm.event_id} onValueChange={handleEventChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} - {format(new Date(event.start_date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {uploadForm.link_type === 'programme' && (
              <div>
                <Label>Select Programme Meeting</Label>
                <Select value={uploadForm.programme_id} onValueChange={handleProgrammeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose meeting..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programmes.map(prog => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.title} - {format(new Date(prog.date), 'MMM d, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {uploadForm.link_type === 'manual' && (
              <div>
                <Label>Event Name</Label>
                <Input
                  value={uploadForm.manual_event_name}
                  onChange={(e) => setUploadForm({ ...uploadForm, manual_event_name: e.target.value })}
                  placeholder="Enter event name..."
                />
              </div>
            )}

            <div>
              <Label>Section</Label>
              <Select 
                value={uploadForm.section_id} 
                onValueChange={(value) => setUploadForm({ ...uploadForm, section_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Caption (optional)</Label>
              <Input
                value={uploadForm.caption}
                onChange={(e) => setUploadForm({ ...uploadForm, caption: e.target.value })}
                placeholder="Add a caption..."
              />
            </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={uploadForm.visible_to}
                onValueChange={(value) => setUploadForm({ ...uploadForm, visible_to: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leaders">Leaders Only</SelectItem>
                  <SelectItem value="parents">Parents & Leaders</SelectItem>
                  <SelectItem value="public">Public Gallery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-public"
                checked={uploadForm.is_public}
                onChange={(e) => setUploadForm({ ...uploadForm, is_public: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is-public" className="cursor-pointer">
                Show in public gallery
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}