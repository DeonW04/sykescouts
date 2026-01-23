import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit2, Check } from 'lucide-react';

export default function HeadingBlock({ data, onUpdate, isEditing, setIsEditing, isPreview, isPublicView }) {
   const [text, setText] = useState(data.text || '');
   const [size, setSize] = useState(data.size || 'h1');

   const handleSave = () => {
     onUpdate({ text, size });
     setIsEditing(false);
   };

   if (!isEditing) {
     return (
       <div className={`${size === 'h1' ? 'text-3xl' : size === 'h2' ? 'text-2xl' : 'text-xl'} font-bold mb-4`}>
         {text || 'Heading'}
         {!isPreview && !isPublicView && (
           <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="ml-2">
             <Edit2 className="w-4 h-4" />
           </Button>
         )}
       </div>
     );
   }

  return (
    <div className="space-y-3 w-full">
      <div className="flex gap-2">
        <Select value={size} onValueChange={setSize}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter heading text..."
      />
      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}