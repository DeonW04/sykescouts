import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Check, Upload, FileText, Trash2, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function FileAttachmentBlock({ data, onUpdate, isEditing, setIsEditing, isPreview, isPublicView }) {
  const [files, setFiles] = useState(data.files || []);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newFiles = [...files, { name: file.name, url: file_url }];
      setFiles(newFiles);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (url) => {
    const newFiles = files.filter(f => f.url !== url);
    setFiles(newFiles);
  };

  const handleSave = () => {
    onUpdate({ files });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="mb-4">
        {files.length === 0 ? (
          <p className="text-gray-500 text-sm">No files attached</p>
        ) : (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-sm">{file.name}</span>
                </div>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
        {!isPreview && !isPublicView && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="mt-2">
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <Label>Attach Files</Label>
      
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-sm">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(file.url)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
          className="flex-1"
        />
        {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
      </div>

      <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" size="sm">
        <Check className="w-4 h-4 mr-1" />
        Save
      </Button>
    </div>
  );
}