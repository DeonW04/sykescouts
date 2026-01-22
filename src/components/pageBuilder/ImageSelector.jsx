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

  const { data: photos = [] } = useQuery({
    queryKey: ['event-photos'],
    queryFn: () => base44.entities.EventPhoto.filter({}),
  });

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
            <label className="block">
              <Button
                as="span"
                variant="outline"
                className="w-full cursor-pointer"
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : `Choose ${isMultiple ? 'Images' : 'Image'}`}
              </Button>
              <input
                type="file"
                multiple={isMultiple}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
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
            {photos.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No photos in gallery yet</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => handleSelectFromGallery(photo.photo_url)}
                      className="relative cursor-pointer group"
                    >
                      <img
                        src={photo.photo_url}
                        alt="Gallery"
                        className="w-full h-24 object-cover rounded group-hover:opacity-75 transition"
                      />
                      {isMultiple && selectedImages.includes(photo.photo_url) && (
                        <div className="absolute inset-0 bg-blue-500/50 rounded flex items-center justify-center">
                          <span className="text-white font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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