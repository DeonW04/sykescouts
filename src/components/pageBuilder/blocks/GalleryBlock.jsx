import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Check, Upload, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function GalleryBlock({ data, onUpdate, isEditing, setIsEditing }) {
  const [images, setImages] = useState(data.images || []);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const uploadedImages = [];
      for (let file of files) {
        const response = await base44.integrations.Core.UploadFile({ file });
        uploadedImages.push(response.file_url);
      }
      setImages([...images, ...uploadedImages]);
      toast.success(`${uploadedImages.length} images uploaded`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) => {
    setImages(images.filter(img => img !== url));
  };

  const handleSave = () => {
    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }
    onUpdate({ images });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="grid grid-cols-4 gap-2 w-full">
          {images.map((img, idx) => (
            <img key={idx} src={img} alt={`Gallery ${idx}`} className="w-full h-24 object-cover rounded" />
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <label>
        <Button
          as="span"
          variant="outline"
          className="w-full cursor-pointer"
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Images'}
        </Button>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative">
            <img src={img} alt={`Gallery ${idx}`} className="w-full h-24 object-cover rounded" />
            <button
              onClick={() => removeImage(img)}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}