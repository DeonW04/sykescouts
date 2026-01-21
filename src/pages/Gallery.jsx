import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhotoGallery from '../components/events/PhotoGallery';

export default function Gallery() {
  const [selectedType, setSelectedType] = useState('all');

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['published-events'],
    queryFn: () => base44.entities.Event.filter({ published: true }, '-start_date'),
  });

  const { data: allPhotos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['public-photos'],
    queryFn: () => base44.entities.EventPhoto.filter({ is_public: true }, '-created_date'),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['active-sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const isLoading = eventsLoading || photosLoading;

  // Group photos by event
  const photosByEvent = events.map(event => ({
    event,
    photos: allPhotos.filter(p => p.event_id === event.id),
  })).filter(group => group.photos.length > 0);

  // Filter by event type
  const filteredGroups = selectedType === 'all'
    ? photosByEvent
    : selectedType === 'events'
    ? photosByEvent.filter(g => ['trip', 'visit', 'activity', 'other'].includes(g.event.type))
    : photosByEvent.filter(g => g.event.type === selectedType);

  const eventTypes = [
    { value: 'all', label: 'All' },
    { value: 'camp', label: 'Camps' },
    { value: 'events', label: 'Events' },
    { value: 'meeting', label: 'Meetings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 justify-center mb-4">
            <Camera className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold text-center">Photo Gallery</h1>
          <p className="text-center mt-2 text-purple-100">
            Browse photos from our events and activities
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            <Tabs value={selectedType} onValueChange={setSelectedType} className="mb-8">
              <TabsList className="grid w-full grid-cols-4">
                {eventTypes.map(type => (
                  <TabsTrigger key={type.value} value={type.value}>
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No photos available yet</p>
                <p className="text-sm mt-2">Check back soon for event photos!</p>
              </div>
            ) : (
              <div className="space-y-12">
                {filteredGroups.map(({ event, photos }) => (
                  <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="capitalize">{event.type}</span>
                        <span>•</span>
                        <span>{new Date(event.start_date).toLocaleDateString('en-GB')}</span>
                        {event.location && (
                          <>
                            <span>•</span>
                            <span>{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <PhotoGallery photos={photos} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}