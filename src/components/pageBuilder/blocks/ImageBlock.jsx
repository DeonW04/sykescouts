import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';
import ImageSelector from '../ImageSelector';

export default function ImageBlock({ data, onUpdate, isEditing, setIsEditing, isPreview, isPublicView }) {
   const [imageUrl, setImageUrl] = useState(data.imageUrl || '');
   const [lightboxOpen, setLightboxOpen] = useState(false);

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
       <>
         <div className="mb-4">
           {imageUrl && (
             <img 
               src={imageUrl} 
               alt="Content" 
               className="w-full h-64 object-contain rounded mb-4 cursor-pointer hover:opacity-90 transition-opacity" 
               onClick={() => setLightboxOpen(true)}
             />
           )}
           {!isPreview && !isPublicView && (
             <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
               <Edit2 className="w-4 h-4" />
             </Button>
           )}
         </div>

         <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
           <DialogContent className="max-w-4xl p-0">
             <img
               src={imageUrl}
               alt="Full size"
               className="w-full max-h-[90vh] object-contain"
             />
           </DialogContent>
         </Dialog>
       </>
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