import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function PhotoLightbox({ photos, currentIndex, onClose, onNavigate }) {
  if (currentIndex === null || !photos[currentIndex]) return null;

  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  return (
    <Dialog open={currentIndex !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full p-0 bg-black/95">
        <div className="relative w-full h-[80vh] flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>

          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate(currentIndex - 1)}
              className="absolute left-4 z-10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          <img
            src={photo.file_url}
            alt={photo.caption || 'Event photo'}
            className="max-w-full max-h-full object-contain"
          />

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate(currentIndex + 1)}
              className="absolute right-4 z-10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {photo.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-4 text-center">
              <p>{photo.caption}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}