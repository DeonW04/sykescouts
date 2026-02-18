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
import { Upload, Trash2, Loader2, ImageIcon, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SearchableEventSelect from '../components/gallery/SearchableEventSelect';

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
    manual_date: '',
    manual_type: 'Event',
    section_id: '',
    caption: '',
    visible_to: 'parents',
    is_public: false,
  });
  const [view, setView] = useState('all'); // 'all', 'camps', 'events', 'meetings'
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState(null);
  const [filteredProgrammes, setFilteredProgrammes] = useState(null);
  const [selectedSection, setSelectedSection] = useState('all');
  const [editAlbumDialog, setEditAlbumDialog] = useState(false);
  const [editAlbumItem, setEditAlbumItem] = useState(null);
  const [editAlbumForm, setEditAlbumForm] = useState({ section_id: '', visible_to: '' });

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

  const updatePhotosMutation = useMutation({
    mutationFn: async ({ photos, updates }) => {
      for (const photo of photos) {
        await base44.entities.EventPhoto.update(photo.id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-photos']);
      toast.success('Album updated');
      setEditAlbumDialog(false);
    },
  });

  const handleEditAlbum = (e, item, type) => {
    e.stopPropagation();
    setEditAlbumItem({ ...item, itemType: type });
    // Get photos for this album to read current settings
    const photos = allPhotos.filter(p => {
      if (item.isManual) return p.manual_event_name === item.title && (p.manual_date || 'no-date') === (item.date || 'no-date');
      if (type === 'meeting') return p.programme_id === item.id;
      return p.event_id === item.id;
    });
    const firstPhoto = photos[0];
    setEditAlbumForm({
      section_id: firstPhoto?.section_id || '',
      visible_to: firstPhoto?.visible_to || 'parents',
    });
    setEditAlbumDialog(true);
  };

  const handleSaveAlbumEdit = () => {
    const photos = allPhotos.filter(p => {
      if (editAlbumItem.isManual) return p.manual_event_name === editAlbumItem.title && (p.manual_date || 'no-date') === (editAlbumItem.date || 'no-date');
      if (editAlbumItem.itemType === 'meeting') return p.programme_id === editAlbumItem.id;
      return p.event_id === editAlbumItem.id;
    });
    updatePhotosMutation.mutate({ photos, updates: editAlbumForm });
  };

  const deleteAlbumMutation = useMutation({
    mutationFn: async (photos) => {
      for (const photo of photos) {
        await base44.entities.EventPhoto.delete(photo.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-photos']);
      toast.success('Album deleted');
      setEditAlbumDialog(false);
    },
  });

  const handleDeleteAlbum = () => {
    if (!window.confirm('Delete this album and all its photos? This cannot be undone.')) return;
    const photos = allPhotos.filter(p => {
      if (editAlbumItem.isManual) return p.manual_event_name === editAlbumItem.title && (p.manual_date || 'no-date') === (editAlbumItem.date || 'no-date');
      if (editAlbumItem.itemType === 'meeting') return p.programme_id === editAlbumItem.id;
      return p.event_id === editAlbumItem.id;
    });
    deleteAlbumMutation.mutate(photos);
  };

  // Filter photos by selected section (include 'all' section photos in every section's view)
  const sectionFilteredPhotos = selectedSection === 'all'
    ? allPhotos
    : allPhotos.filter(p => p.section_id === selectedSection || p.section_id === 'all');

  // Get unique camps, events, and meetings - sorted by date
  const camps = [...new Map(
    sectionFilteredPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const regularEvents = [...new Map(
    sectionFilteredPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const meetings = [...new Map(
    sectionFilteredPhotos
      .filter(p => p.programme_id)
      .map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Manual entries grouped by name+date
  const manualEntries = [...new Map(
    sectionFilteredPhotos
      .filter(p => p.manual_event_name)
      .map(p => [`${p.manual_event_name}-${p.manual_date || 'no-date'}`, {
        id: `${p.manual_event_name}-${p.manual_date || 'no-date'}`,
        title: p.manual_event_name,
        date: p.manual_date,
        section_id: p.section_id,
        isManual: true
      }])
  ).values()].filter(Boolean).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  const getDisplayPhotos = () => {
    if (selectedItem) {
      if (selectedItem.isManual) {
        return sectionFilteredPhotos.filter(p => 
          p.manual_event_name === selectedItem.title && 
          (p.manual_date || 'no-date') === (selectedItem.date || 'no-date')
        );
      }
      return sectionFilteredPhotos.filter(p => 
        p.event_id === selectedItem.id || 
        p.programme_id === selectedItem.id
      );
    }
    return sectionFilteredPhotos;
  };

  const displayPhotos = getDisplayPhotos();

  const getItemPhoto = (item, type) => {
    if (type === 'meeting') {
      return allPhotos.find(p => p.programme_id === item.id)?.file_url;
    }
    if (item.isManual) {
      return allPhotos.find(p => 
        p.manual_event_name === item.title && 
        (p.manual_date || 'no-date') === (item.date || 'no-date')
      )?.file_url;
    }
    return allPhotos.find(p => p.event_id === item.id)?.file_url;
  };

  const getItemPhotoCount = (item, type) => {
    if (type === 'meeting') {
      return allPhotos.filter(p => p.programme_id === item.id).length;
    }
    if (item.isManual) {
      return allPhotos.filter(p => 
        p.manual_event_name === item.title && 
        (p.manual_date || 'no-date') === (item.date || 'no-date')
      ).length;
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
      manual_date: '',
      manual_type: 'Event',
      section_id: '',
    });
    setFilteredEvents(null);
    setFilteredProgrammes(null);
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
      toast.error('Please select a section (or "All Sections" for group events)');
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
          manual_date: uploadForm.link_type === 'manual' ? uploadForm.manual_date : undefined,
          manual_type: uploadForm.link_type === 'manual' ? uploadForm.manual_type : undefined,
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
        <input
          type="file"
          id="photo-upload"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <label 
          htmlFor="photo-upload" 
          className="block mb-8 cursor-pointer group"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 p-1 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
            <div className="bg-white rounded-xl p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Upload Photos
              </h2>
              <p className="text-gray-600 text-lg mb-4">
                Add photos from camps, events, and meetings
              </p>
              <div className="inline-flex items-center gap-2 text-purple-600 font-semibold text-lg">
                <span>Click to select photos</span>
                <Upload className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Supports JPEG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>
        </label>

        {/* Section Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setSelectedSection('all'); setSelectedItem(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedSection === 'all' ? 'bg-[#004851] text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}
          >
            All Sections
          </button>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedSection(s.id); setSelectedItem(null); setView('all'); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${selectedSection === s.id ? 'bg-[#7413dc] text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              {s.display_name}
            </button>
          ))}
        </div>

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
                  <img src={getItemPhoto(camp, 'camp')} alt={camp.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="font-bold text-lg mb-1 text-center">{camp.title}</h3>
                  <p className="text-sm">{getItemPhotoCount(camp, 'camp')} photos</p>
                </div>
                <button
                  onClick={(e) => handleEditAlbum(e, camp, 'camp')}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            
            {view === 'events' && regularEvents.map((event) => (
              <div
                key={event.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer shadow hover:shadow-lg transition"
                onClick={() => setSelectedItem(event)}
              >
                {getItemPhoto(event, 'event') ? (
                  <img src={getItemPhoto(event, 'event')} alt={event.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="font-bold text-lg mb-1 text-center">{event.title}</h3>
                  <p className="text-sm">{getItemPhotoCount(event, 'event')} photos</p>
                </div>
                <button
                  onClick={(e) => handleEditAlbum(e, event, 'event')}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            
            {view === 'meetings' && meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer shadow hover:shadow-lg transition"
                onClick={() => setSelectedItem(meeting)}
              >
                {getItemPhoto(meeting, 'meeting') ? (
                  <img src={getItemPhoto(meeting, 'meeting')} alt={meeting.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="font-bold text-lg mb-1 text-center">{meeting.title}</h3>
                  <p className="text-sm">{getItemPhotoCount(meeting, 'meeting')} photos</p>
                </div>
                <button
                  onClick={(e) => handleEditAlbum(e, meeting, 'meeting')}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Album Dialog */}
      <Dialog open={editAlbumDialog} onOpenChange={setEditAlbumDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section</Label>
              <Select value={editAlbumForm.section_id} onValueChange={(v) => setEditAlbumForm({ ...editAlbumForm, section_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections (Group Event)</SelectItem>
                  {sections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select
                value={editAlbumForm.visible_to === 'public' || (editAlbumForm.is_public) ? 'public' : editAlbumForm.visible_to}
                onValueChange={(v) => setEditAlbumForm({ ...editAlbumForm, visible_to: v === 'public' ? 'parents' : v, is_public: v === 'public' })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leaders">Leaders Only</SelectItem>
                  <SelectItem value="parents">Parents & Leaders</SelectItem>
                  <SelectItem value="public">Public Gallery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditAlbumDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveAlbumEdit} disabled={updatePhotosMutation.isPending}>
                {updatePhotosMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Upload {selectedFiles.length} Photo{selectedFiles.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {selectedFiles.slice(0, 2).map((file, idx) => (
                <img
                  key={idx}
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${idx + 1}`}
                  className="w-full aspect-square object-cover rounded border"
                />
              ))}
              {selectedFiles.length > 2 && (
                <div className="w-full aspect-square bg-gray-100 rounded border flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">+ {selectedFiles.length - 2} more</span>
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
                <Label>Search and Select Event</Label>
                <SearchableEventSelect
                  items={events}
                  value={uploadForm.event_id}
                  onValueChange={handleEventChange}
                  placeholder="Search by name, date, or month..."
                  type="event"
                />
              </div>
            )}

            {uploadForm.link_type === 'programme' && (
              <div>
                <Label>Search and Select Meeting</Label>
                <SearchableEventSelect
                  items={programmes}
                  value={uploadForm.programme_id}
                  onValueChange={handleProgrammeChange}
                  placeholder="Search by name, date, or month..."
                  type="programme"
                />
              </div>
            )}

            {uploadForm.link_type === 'manual' && (
              <>
                <div>
                  <Label>Event Name</Label>
                  <Input
                    value={uploadForm.manual_event_name}
                    onChange={(e) => setUploadForm({ ...uploadForm, manual_event_name: e.target.value })}
                    placeholder="Enter event name..."
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={uploadForm.manual_type}
                    onValueChange={(value) => setUploadForm({ ...uploadForm, manual_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Camp">Camp</SelectItem>
                      <SelectItem value="Event">Event</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Event Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.manual_date || ''}
                    onChange={(e) => setUploadForm({ ...uploadForm, manual_date: e.target.value })}
                  />
                </div>
              </>
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
                  <SelectItem value="all">All Sections (Group Event)</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {uploadForm.section_id === 'all' && (
                <p className="text-xs text-blue-600 mt-1">These photos will appear in all sections' galleries.</p>
              )}
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
                value={uploadForm.is_public ? 'public' : uploadForm.visible_to}
                onValueChange={(value) => {
                  if (value === 'public') {
                    setUploadForm({ ...uploadForm, visible_to: 'parents', is_public: true });
                  } else {
                    setUploadForm({ ...uploadForm, visible_to: value, is_public: false });
                  }
                }}
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

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading} className="w-full sm:w-auto">
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