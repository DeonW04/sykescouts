import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';
import ImageSelector from '../ImageSelector';

export default function ImageBlock({ data, onUpdate, isEditing, setIsEditing, isPreview }) {
   const [imageUrl, setImageUrl] = useState(data.imageUrl || '');

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
       <div className="mb-4">
         {imageUrl && (
           <img src={imageUrl} alt="Content" className="w-full h-64 object-cover rounded mb-4" />
         )}
         {!isPreview && (
           <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
             <Edit2 className="w-4 h-4" />
           </Button>
         )}
       </div>
     );
   }

  return (
    <div className="space-y-3 w-full">
      <ImageSelector onSelect={(url) => setImageUrl(url)} isMultiple={false} />
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