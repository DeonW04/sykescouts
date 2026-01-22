import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LeaderNav from '../components/leader/LeaderNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function LeaderGallery() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
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
  const [view, setView] = useState('all'); // 'all', 'camps', 'events', 'meetings'
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

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

  // Get unique camps, events, and meetings
  const camps = [...new Map(
    allPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean);

  const regularEvents = [...new Map(
    allPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean);

  const meetings = [...new Map(
    allPhotos
      .filter(p => p.programme_id)
      .map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])
  ).values()].filter(Boolean);

  const getDisplayPhotos = () => {
    if (selectedItem) {
      return allPhotos.filter(p => 
        p.event_id === selectedItem.id || 
        p.programme_id === selectedItem.id
      );
    }
    return allPhotos;
  };

  const displayPhotos = getDisplayPhotos();

  const getItemPhoto = (item, type) => {
    if (type === 'meeting') {
      return allPhotos.find(p => p.programme_id === item.id)?.file_url;
    }
    return allPhotos.find(p => p.event_id === item.id)?.file_url;
  };

  const getItemPhotoCount = (item, type) => {
    if (type === 'meeting') {
      return allPhotos.filter(p => p.programme_id === item.id).length;
    }
    return allPhotos.filter(p => p.event_id === item.id).length;
  };

  const handlePhotoSelect = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedPhotos.length} selected photo(s)?`)) return;
    
    for (const photoId of selectedPhotos) {
      await deletePhotoMutation.mutateAsync(photoId);
    }
    setSelectedPhotos([]);
    setSelectMode(false);
  };

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
    setUploadProgress({ current: 0, total: selectedFiles.length });
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
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
        
        setUploadProgress({ current: i + 1, total: selectedFiles.length });
      }

      queryClient.invalidateQueries(['all-photos']);
      toast.success(`${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`);
      setShowUploadDialog(false);
      setSelectedFiles([]);
      setUploadProgress({ current: 0, total: 0 });
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
      setUploadProgress({ current: 0, total: 0 });
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
      <LeaderNav />
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white py-8">
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

        {/* Category Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Button
            variant={view === 'camps' ? 'default' : 'outline'}
            className="h-24"
            onClick={() => {
              setView('camps');
              setSelectedItem(null);
              setSelectMode(false);
              setSelectedPhotos([]);
            }}
          >
            <div className="flex flex-col items-center">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="font-semibold">Camps</span>
              <span className="text-xs opacity-80">{camps.length} albums</span>
            </div>
          </Button>

          <Button
            variant={view === 'events' ? 'default' : 'outline'}
            className="h-24"
            onClick={() => {
              setView('events');
              setSelectedItem(null);
              setSelectMode(false);
              setSelectedPhotos([]);
            }}
          >
            <div className="flex flex-col items-center">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="font-semibold">Events</span>
              <span className="text-xs opacity-80">{regularEvents.length} albums</span>
            </div>
          </Button>

          <Button
            variant={view === 'meetings' ? 'default' : 'outline'}
            className="h-24"
            onClick={() => {
              setView('meetings');
              setSelectedItem(null);
              setSelectMode(false);
              setSelectedPhotos([]);
            }}
          >
            <div className="flex flex-col items-center">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="font-semibold">Meetings</span>
              <span className="text-xs opacity-80">{meetings.length} albums</span>
            </div>
          </Button>
        </div>

        {/* Back/Actions Bar */}
        {(selectedItem || selectMode) && (
          <div className="flex items-center justify-between mb-6">
            {selectedItem ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedItem(null);
                  setSelectMode(false);
                  setSelectedPhotos([]);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Back to {view === 'camps' ? 'Camps' : view === 'events' ? 'Events' : 'Meetings'}
              </Button>
            ) : <div />}
            
            {selectMode ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedPhotos([]);
                  }}
                >
                  Cancel
                </Button>
                {selectedPhotos.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedPhotos.length} Selected
                  </Button>
                )}
              </div>
            ) : selectedItem && (
              <Button onClick={() => setSelectMode(true)}>
                Select Multiple
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : displayPhotos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No photos uploaded yet</p>
            </CardContent>
          </Card>
        ) : view === 'all' || selectedItem ? (
          /* Show photos grid */
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayPhotos.map((photo) => (
              <div
                key={photo.id}
                className={`relative group rounded-lg overflow-hidden ${
                  selectMode ? 'cursor-pointer' : ''
                } ${selectedPhotos.includes(photo.id) ? 'ring-4 ring-purple-600' : ''}`}
                onClick={() => selectMode && handlePhotoSelect(photo.id)}
              >
                <img
                  src={photo.file_url}
                  alt={photo.caption || ''}
                  className="w-full aspect-square object-cover"
                />
                {selectMode && (
                  <div className="absolute top-2 right-2">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.includes(photo.id)}
                      onChange={() => handlePhotoSelect(photo.id)}
                      className="w-6 h-6 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                {!selectMode && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-white text-xs">
                    <p className="font-medium mb-1 text-center">{getPhotoLabel(photo)}</p>
                    {photo.caption && <p className="text-center mb-2">{photo.caption}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Show grid of camps/events/meetings */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {view === 'camps' && camps.map((camp) => (
              <div
                key={camp.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer shadow hover:shadow-lg transition"
                onClick={() => setSelectedItem(camp)}
              >
                {getItemPhoto(camp, 'camp') ? (
                  <img
                    src={getItemPhoto(camp, 'camp')}
                    alt={camp.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="font-bold text-lg mb-1 text-center">{camp.title}</h3>
                  <p className="text-sm">{getItemPhotoCount(camp, 'camp')} photos</p>
                </div>
              </div>
            ))}
            
            {view === 'events' && regularEvents.map((event) => (
              <div
                key={event.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer shadow hover:shadow-lg transition"
                onClick={() => setSelectedItem(event)}
              >
                {getItemPhoto(event, 'event') ? (
                  <img
                    src={getItemPhoto(event, 'event')}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="font-bold text-lg mb-1 text-center">{event.title}</h3>
                  <p className="text-sm">{getItemPhotoCount(event, 'event')} photos</p>
                </div>
              </div>
            ))}
            
            {view === 'meetings' && meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer shadow hover:shadow-lg transition"
                onClick={() => setSelectedItem(meeting)}
              >
                {getItemPhoto(meeting, 'meeting') ? (
                  <img
                    src={getItemPhoto(meeting, 'meeting')}
                    alt={meeting.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="font-bold text-lg mb-1 text-center">{meeting.title}</h3>
                  <p className="text-sm">{getItemPhotoCount(meeting, 'meeting')} photos</p>
                </div>
              </div>
            ))}
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
              {selectedFiles.slice(0, 3).map((file, idx) => (
                <img
                  key={idx}
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${idx + 1}`}
                  className="w-full aspect-square object-cover rounded border"
                />
              ))}
              {selectedFiles.length > 3 && (
                <div className="w-full aspect-square bg-gray-100 rounded border flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">+ {selectedFiles.length - 3} more</span>
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
                    Uploading {uploadProgress.current}/{uploadProgress.total}
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