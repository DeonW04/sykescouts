import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Loader2, ImageIcon, Filter, X, Eye, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [view, setView] = useState('all'); // 'all', 'camps', 'events', 'meetings'
  const [selectedItem, setSelectedItem] = useState(null); // specific event/camp/meeting
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

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
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean);

  const regularEvents = [...new Map(
    allPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean);

  const meetings = [...new Map(
    allPhotos
      .filter(p => p.programme_id)
      .map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])
  ).values()].filter(Boolean);

  // Get photos for current view
  const getDisplayPhotos = () => {
    if (selectedItem) {
      // Show photos for specific item
      return allPhotos.filter(p => 
        p.event_id === selectedItem.id || 
        p.programme_id === selectedItem.id
      );
    }
    
    // Default: show all photos in random order
    return [...allPhotos].sort(() => Math.random() - 0.5);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-[#7413dc] to-[#004851] text-white py-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">Photo Gallery</h1>
              <p className="text-purple-100 text-lg">
                {selectedItem ? getPhotoLabel(allPhotos.find(p => p.event_id === selectedItem.id || p.programme_id === selectedItem.id)) : 'Capture and share your scouting adventures'}
              </p>
            </div>
            <div>
              <input
                type="file"
                id="photo-upload"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button asChild size="lg" className="bg-white text-[#7413dc] hover:bg-gray-100 shadow-lg">
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Photos
                </label>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Icons */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('camps');
              setSelectedItem(null);
            }}
            className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all ${
              view === 'camps' 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                view === 'camps' ? 'bg-white/20' : 'bg-green-100'
              }`}>
                <svg className={`w-8 h-8 ${view === 'camps' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Camps</h3>
              <p className="text-sm opacity-80">{camps.length} camps</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('events');
              setSelectedItem(null);
            }}
            className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all ${
              view === 'events' 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                view === 'events' ? 'bg-white/20' : 'bg-blue-100'
              }`}>
                <Calendar className={`w-8 h-8 ${view === 'events' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">Events</h3>
              <p className="text-sm opacity-80">{regularEvents.length} events</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('meetings');
              setSelectedItem(null);
            }}
            className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all ${
              view === 'meetings' 
                ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                view === 'meetings' ? 'bg-white/20' : 'bg-purple-100'
              }`}>
                <svg className={`w-8 h-8 ${view === 'meetings' ? 'text-white' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Meetings</h3>
              <p className="text-sm opacity-80">{meetings.length} meetings</p>
            </div>
          </motion.button>
        </div>

        {/* Back Button when viewing specific item */}
        {selectedItem && (
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => setSelectedItem(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {view === 'camps' ? 'Camps' : view === 'events' ? 'Events' : 'Meetings'}
          </Button>
        )}

        {/* Gallery Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-500">Loading your photos...</p>
          </div>
        ) : displayPhotos.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-20 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No photos found</h3>
              <p className="text-gray-500 mb-6">Start by uploading some photos</p>
            </CardContent>
          </Card>
        ) : view === 'all' || selectedItem ? (
          /* Show photos grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {displayPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.02 }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => {
                    setLightboxPhoto(photo);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={photo.file_url}
                    alt={photo.caption || ''}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this photo?')) {
                            deletePhotoMutation.mutate(photo.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Show grid of camps/events/meetings */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {view === 'camps' && camps.map((camp) => (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(camp)}
              >
                {getItemPhoto(camp, 'camp') ? (
                  <img
                    src={getItemPhoto(camp, 'camp')}
                    alt={camp.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{camp.title}</h3>
                    <p className="text-sm opacity-90">{getItemPhotoCount(camp, 'camp')} photos</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {view === 'events' && regularEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(event)}
              >
                {getItemPhoto(event, 'event') ? (
                  <img
                    src={getItemPhoto(event, 'event')}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{event.title}</h3>
                    <p className="text-sm opacity-90">{getItemPhotoCount(event, 'event')} photos</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {view === 'meetings' && meetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(meeting)}
              >
                {getItemPhoto(meeting, 'meeting') ? (
                  <img
                    src={getItemPhoto(meeting, 'meeting')}
                    alt={meeting.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{meeting.title}</h3>
                    <p className="text-sm opacity-90">{getItemPhotoCount(meeting, 'meeting')} photos</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0">
          {lightboxPhoto && (
            <div className="relative">
              <img
                src={lightboxPhoto.file_url}
                alt={lightboxPhoto.caption || ''}
                className="w-full max-h-[80vh] object-contain"
              />
              {lightboxPhoto.caption && (
                <div className="p-6 bg-white">
                  <p className="text-gray-900 font-medium">{lightboxPhoto.caption}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <span>{getPhotoLabel(lightboxPhoto)}</span>
                    {sections.find(s => s.id === lightboxPhoto.section_id) && (
                      <>
                        <span>•</span>
                        <span>{sections.find(s => s.id === lightboxPhoto.section_id)?.display_name}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
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