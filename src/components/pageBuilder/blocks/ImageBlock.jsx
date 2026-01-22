import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Check, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ImageBlock({ data, onUpdate, isEditing, setIsEditing }) {
  const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(response.file_url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!imageUrl) {
      toast.error('Please upload or select an image');
      return;
    }
    onUpdate({ imageUrl });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-2">
        {imageUrl && (
          <img src={imageUrl} alt="Content" className="w-full h-64 object-cover rounded" />
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex gap-2">
        <label className="flex-1">
          <Button
            as="span"
            variant="outline"
            className="w-full cursor-pointer"
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover rounded" />
      )}
      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}