import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PhotoGallery from './PhotoGallery';

export default function PhotoManagementSection({ eventId }) {
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    caption: '',
    visible_to: 'parents',
    is_public: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const queryClient = useQueryClient();

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['event-photos', eventId],
    queryFn: () => base44.entities.EventPhoto.filter({ event_id: eventId }, '-created_date'),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId) => base44.entities.EventPhoto.delete(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-photos', eventId]);
      toast.success('Photo deleted');
    },
    onError: () => toast.error('Failed to delete photo'),
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      await base44.entities.EventPhoto.create({
        event_id: eventId,
        file_url,
        caption: uploadForm.caption,
        visible_to: uploadForm.visible_to,
        is_public: uploadForm.is_public,
        uploaded_by: user.id,
      });

      queryClient.invalidateQueries(['event-photos', eventId]);
      toast.success('Photo uploaded successfully');
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ caption: '', visible_to: 'parents', is_public: false });
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Event Photos</CardTitle>
        <div>
          <input
            type="file"
            id="photo-upload"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button asChild size="sm">
            <label htmlFor="photo-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </label>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <PhotoGallery photos={photos} />
            
            {photos.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-sm">Manage Photos</h4>
                <div className="space-y-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <img src={photo.file_url} alt="" className="w-12 h-12 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{photo.caption || 'No caption'}</p>
                        <p className="text-xs text-gray-500">
                          Visible to: {photo.visible_to} {photo.is_public && '• Public'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePhotoMutation.mutate(photo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFile && (
              <div className="rounded-lg overflow-hidden border">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}
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
    </Card>
  );
}