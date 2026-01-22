import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Check, Bold, Italic } from 'lucide-react';

export default function TextBlock({ data, onUpdate, isEditing, setIsEditing }) {
  const [text, setText] = useState(data.text || '');

  const handleSave = () => {
    onUpdate({ text });
    setIsEditing(false);
  };

  const applyFormatting = (format) => {
    let formatted = text;
    if (format === 'bold') formatted = `**${text}**`;
    if (format === 'italic') formatted = `*${text}*`;
    setText(formatted);
  };

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700">{text || 'Text content'}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex gap-1 bg-gray-100 p-2 rounded">
        <Button variant="ghost" size="sm" onClick={() => applyFormatting('bold')} title="Bold">
          <Bold className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => applyFormatting('italic')} title="Italic">
          <Italic className="w-4 h-4" />
        </Button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text... (use **bold** and *italic*)"
        rows={4}
      />
      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}