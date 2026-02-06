import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, ImageIcon, Calendar, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';

export default function Gallery() {
  const [view, setView] = useState('all'); // 'all', 'camps', 'events', 'meetings'
  const [selectedItem, setSelectedItem] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [displayCount, setDisplayCount] = useState(30);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['all-events'],
    queryFn: () => base44.entities.Event.list('-start_date'),
  });

  const { data: programmes = [], isLoading: programmesLoading } = useQuery({
    queryKey: ['all-programmes'],
    queryFn: () => base44.entities.Programme.list('-date'),
  });

  const { data: allPhotos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['public-photos'],
    queryFn: async () => {
      const photos = await base44.entities.EventPhoto.filter({});
      return photos.filter(p => p.is_public === true || p.visible_to === 'parents' || p.visible_to === 'public');
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['active-sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const isLoading = eventsLoading || photosLoading || programmesLoading;

  // Get unique camps, events, and meetings
  const camps = [...new Map(
    allPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean);

  const regularEvents = [...new Map(
    allPhotos
      .filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp'))
      .map(p => [p.event_id, events.find(e => e.id === p.event_id)])
  ).values()].filter(Boolean);

  const meetings = [...new Map(
    allPhotos
      .filter(p => p.programme_id)
      .map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])
  ).values()].filter(Boolean);

  // Get photos for current view
  const getDisplayPhotos = () => {
    if (selectedItem) {
      return allPhotos.filter(p => 
        p.event_id === selectedItem.id || 
        p.programme_id === selectedItem.id
      );
    }
    return [...allPhotos].sort(() => Math.random() - 0.5);
  };

  const allDisplayPhotos = getDisplayPhotos();
  const displayPhotos = allDisplayPhotos.slice(0, displayCount);
  const hasMore = allDisplayPhotos.length > displayCount;

  const getItemPhoto = (item, type) => {
    if (type === 'meeting') {
      return allPhotos.find(p => p.programme_id === item.id)?.file_url;
    }
    return allPhotos.find(p => p.event_id === item.id)?.file_url;
  };

  const getItemPhotoCount = (item, type) => {
    if (type === 'meeting') {
      return allPhotos.filter(p => p.programme_id === item.id).length;
    }
    return allPhotos.filter(p => p.event_id === item.id).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <SEO 
        title="Gallery | 40th Rochdale (Syke) Scouts"
        description="View photos from our scout activities, camps, and events. See the adventures and fun at 40th Rochdale (Syke) Scouts in action!"
        keywords="scout photos, scout gallery, rochdale scouts events, scout activities photos"
        path="/Gallery"
      />
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-[#7413dc] to-[#004851] text-white py-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-3">Photo Gallery</h1>
              <p className="text-purple-100 text-lg">
                {selectedItem 
                  ? (selectedItem.title || 'Event Photos')
                  : 'Browse photos from our adventures'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Icons */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('camps');
              setSelectedItem(null);
            }}
            className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all ${
              view === 'camps' 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                view === 'camps' ? 'bg-white/20' : 'bg-green-100'
              }`}>
                <svg className={`w-8 h-8 ${view === 'camps' ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Camps</h3>
              <p className="text-sm opacity-80">{camps.length} camps</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('events');
              setSelectedItem(null);
            }}
            className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all ${
              view === 'events' 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                view === 'events' ? 'bg-white/20' : 'bg-blue-100'
              }`}>
                <Calendar className={`w-8 h-8 ${view === 'events' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">Events</h3>
              <p className="text-sm opacity-80">{regularEvents.length} events</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setView('meetings');
              setSelectedItem(null);
            }}
            className={`relative overflow-hidden rounded-2xl p-8 text-center transition-all ${
              view === 'meetings' 
                ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-md'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                view === 'meetings' ? 'bg-white/20' : 'bg-purple-100'
              }`}>
                <svg className={`w-8 h-8 ${view === 'meetings' ? 'text-white' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Meetings</h3>
              <p className="text-sm opacity-80">{meetings.length} meetings</p>
            </div>
          </motion.button>
        </div>

        {/* Back Button when viewing specific item */}
        {selectedItem && (
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => setSelectedItem(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {view === 'camps' ? 'Camps' : view === 'events' ? 'Events' : 'Meetings'}
          </Button>
        )}

        {/* Gallery Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-500">Loading photos...</p>
          </div>
        ) : displayPhotos.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-20 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No photos yet</h3>
              <p className="text-gray-500">Check back soon for event photos!</p>
            </CardContent>
          </Card>
        ) : view === 'all' || selectedItem ? (
          /* Show photos grid */
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <AnimatePresence>
                {displayPhotos.map((photo, index) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => {
                      setLightboxPhoto(photo);
                      setLightboxOpen(true);
                    }}
                  >
                    <img
                      src={photo.thumbnail_url || photo.file_url}
                      alt={photo.caption || ''}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    {photo.caption && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                        <p className="text-white text-sm p-3 font-medium">{photo.caption}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => setDisplayCount(prev => prev + 30)}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Load More Photos ({allDisplayPhotos.length - displayCount} remaining)
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Show grid of camps/events/meetings */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {view === 'camps' && camps.map((camp) => (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(camp)}
              >
                {getItemPhoto(camp, 'camp') ? (
                  <img
                    src={getItemPhoto(camp, 'camp')}
                    alt={camp.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{camp.title}</h3>
                    <p className="text-sm opacity-90">{getItemPhotoCount(camp, 'camp')} photos</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {view === 'events' && regularEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(event)}
              >
                {getItemPhoto(event, 'event') ? (
                  <img
                    src={getItemPhoto(event, 'event')}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{event.title}</h3>
                    <p className="text-sm opacity-90">{getItemPhotoCount(event, 'event')} photos</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {view === 'meetings' && meetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedItem(meeting)}
              >
                {getItemPhoto(meeting, 'meeting') ? (
                  <img
                    src={getItemPhoto(meeting, 'meeting')}
                    alt={meeting.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{meeting.title}</h3>
                    <p className="text-sm opacity-90">{getItemPhotoCount(meeting, 'meeting')} photos</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0">
          {lightboxPhoto && (
            <div className="relative">
              <img
                src={lightboxPhoto.file_url}
                alt={lightboxPhoto.caption || ''}
                className="w-full max-h-[80vh] object-contain"
              />
              {lightboxPhoto.caption && (
                <div className="p-6 bg-white">
                  <p className="text-gray-900 font-medium">{lightboxPhoto.caption}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}