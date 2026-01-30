import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ImageSelector({ onSelect, isMultiple = false }) {
  const [uploading, setUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'camps', 'events', 'meetings'
  const [selectedFolder, setSelectedFolder] = useState(null);

  const { data: photos = [] } = useQuery({
    queryKey: ['event-photos'],
    queryFn: () => base44.entities.EventPhoto.filter({}),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date'),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.list('-date'),
  });

  // Group photos similar to LeaderGallery
  const camps = [...new Map(
    photos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const regularEvents = [...new Map(
    photos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const meetings = [...new Map(
    photos
      .filter(p => p.programme_id)
      .map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])
  ).values()].filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

  const getDisplayPhotos = () => {
    if (selectedFolder) {
      return photos.filter(p => 
        p.event_id === selectedFolder.id || 
        p.programme_id === selectedFolder.id
      );
    }
    return photos;
  };

  const displayPhotos = getDisplayPhotos();

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (let file of files) {
        const response = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(response.file_url);
      }

      if (isMultiple) {
        setSelectedImages([...selectedImages, ...uploadedUrls]);
      } else {
        onSelect(uploadedUrls[0]);
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectFromGallery = (photoUrl) => {
    if (isMultiple) {
      if (!selectedImages.includes(photoUrl)) {
        setSelectedImages([...selectedImages, photoUrl]);
      }
    } else {
      onSelect(photoUrl);
      toast.success('Image selected');
    }
  };

  const handleConfirmMultiple = () => {
    if (selectedImages.length > 0) {
      onSelect(selectedImages);
      toast.success('Images selected');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ImageIcon className="w-4 h-4 mr-2" />
          Select {isMultiple ? 'Images' : 'Image'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select {isMultiple ? 'Images' : 'Image'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="gallery">From Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                multiple={isMultiple}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : `Choose ${isMultiple ? 'Images' : 'Image'}`}
                  </span>
                </Button>
              </label>
            </div>
            {isMultiple && selectedImages.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {selectedImages.map((img, idx) => (
                    <img key={idx} src={img} alt={`Selected ${idx}`} className="w-full h-20 object-cover rounded" />
                  ))}
                </div>
                <Button onClick={handleConfirmMultiple} className="w-full bg-green-600">
                  Confirm {selectedImages.length} Images
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            {!photos || photos.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No photos in gallery yet</p>
            ) : (
              <>
                {!selectedFolder ? (
                  // Show folders
                  <div className="space-y-2">
                    <div className="flex gap-2 mb-4">
                      <Button
                        size="sm"
                        variant={viewMode === 'camps' ? 'default' : 'outline'}
                        onClick={() => setViewMode('camps')}
                      >
                        Camps ({camps.length})
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'events' ? 'default' : 'outline'}
                        onClick={() => setViewMode('events')}
                      >
                        Events ({regularEvents.length})
                      </Button>
                      <Button
                        size="sm"
                        variant={viewMode === 'meetings' ? 'default' : 'outline'}
                        onClick={() => setViewMode('meetings')}
                      >
                        Meetings ({meetings.length})
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {viewMode === 'camps' && camps.map(camp => (
                        <div
                          key={camp.id}
                          onClick={() => setSelectedFolder(camp)}
                          className="relative cursor-pointer group border rounded-lg p-3 hover:bg-gray-50"
                        >
                          <p className="font-medium text-sm">{camp.title}</p>
                          <p className="text-xs text-gray-500">
                            {photos.filter(p => p.event_id === camp.id).length} photos
                          </p>
                        </div>
                      ))}
                      {viewMode === 'events' && regularEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedFolder(event)}
                          className="relative cursor-pointer group border rounded-lg p-3 hover:bg-gray-50"
                        >
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-gray-500">
                            {photos.filter(p => p.event_id === event.id).length} photos
                          </p>
                        </div>
                      ))}
                      {viewMode === 'meetings' && meetings.map(meeting => (
                        <div
                          key={meeting.id}
                          onClick={() => setSelectedFolder(meeting)}
                          className="relative cursor-pointer group border rounded-lg p-3 hover:bg-gray-50"
                        >
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <p className="text-xs text-gray-500">
                            {photos.filter(p => p.programme_id === meeting.id).length} photos
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Show photos in selected folder
                  <>
                    <Button size="sm" variant="outline" onClick={() => setSelectedFolder(null)}>
                      ← Back to folders
                    </Button>
                    <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                      {displayPhotos.map((photo) => {
                        const photoUrl = photo.photo_url || photo.file_url || photo.url;
                        return (
                          <div
                            key={photo.id}
                            onClick={() => handleSelectFromGallery(photoUrl)}
                            className="relative cursor-pointer group"
                          >
                            <img
                              src={photoUrl}
                              alt="Gallery"
                              className="w-full h-24 object-cover rounded group-hover:opacity-75 transition"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                            {isMultiple && selectedImages.includes(photoUrl) && (
                              <div className="absolute inset-0 bg-blue-500/50 rounded flex items-center justify-center">
                                <span className="text-white font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {isMultiple && selectedImages.length > 0 && (
                  <Button onClick={handleConfirmMultiple} className="w-full bg-green-600">
                    Confirm {selectedImages.length} Images
                  </Button>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}