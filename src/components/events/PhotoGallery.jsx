import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import PhotoLightbox from './PhotoLightbox';

export default function PhotoGallery({ photos }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No photos available yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => setLightboxIndex(index)}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
          >
            <img
              src={photo.file_url}
              alt={photo.caption || 'Event photo'}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      <PhotoLightbox
        photos={photos}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}