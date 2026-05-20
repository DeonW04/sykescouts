import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, ImageIcon, Calendar, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import SEO from '../components/SEO';
import LazyImage from '../components/gallery/LazyImage';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import PublicFooter from '../components/public/PublicFooter';

const glassCard = {
  background: '#f8f7ff',
  border: '1px solid rgba(116,19,220,0.12)',
  borderRadius: '20px',
};

export default function Gallery() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  const itemId = urlParams.get('id');

  const [view, setView] = useState(viewParam || 'all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [displayCount, setDisplayCount] = useState(30);
  const [selectedSection, setSelectedSection] = useState('all');

  const { data: events = [], isLoading: eventsLoading } = useQuery({ queryKey: ['all-events'], queryFn: () => base44.entities.Event.list('-start_date') });
  const { data: programmes = [], isLoading: programmesLoading } = useQuery({ queryKey: ['all-programmes'], queryFn: () => base44.entities.Programme.list('-date') });
  const { data: rawPhotos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['public-photos'],
    queryFn: async () => {
      const photos = await base44.entities.EventPhoto.filter({});
      return photos.filter(p => p.is_public === true || p.visible_to === 'parents' || p.visible_to === 'public');
    },
  });
  const { data: sections = [] } = useQuery({ queryKey: ['active-sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });

  const allPhotos = selectedSection === 'all' ? rawPhotos : rawPhotos.filter(p => p.section_id === selectedSection || p.section_id === 'all');
  const isLoading = eventsLoading || photosLoading || programmesLoading;

  React.useEffect(() => {
    if (itemId) {
      if (viewParam === 'camp' || viewParam === 'event') {
        const event = events.find(e => e.id === itemId);
        if (event) setSelectedItem(event);
      } else if (viewParam === 'meeting') {
        const meeting = programmes.find(p => p.id === itemId);
        if (meeting) setSelectedItem(meeting);
      }
    } else {
      setSelectedItem(null);
    }
  }, [itemId, viewParam, events, programmes]);

  const linkedCamps = [...new Map(allPhotos.filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp')).map(p => [p.event_id, events.find(e => e.id === p.event_id)])).values()].filter(Boolean);
  const linkedEvents = [...new Map(allPhotos.filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp')).map(p => [p.event_id, events.find(e => e.id === p.event_id)])).values()].filter(Boolean);
  const linkedMeetings = [...new Map(allPhotos.filter(p => p.programme_id).map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])).values()].filter(Boolean);

  const manualAlbums = [...new Map(
    allPhotos.filter(p => p.manual_event_name)
      .map(p => [`${p.manual_event_name}-${p.manual_date || ''}-${p.manual_type || ''}`, {
        id: `${p.manual_event_name}-${p.manual_date || ''}`,
        title: p.manual_event_name,
        date: p.manual_date,
        manual_type: p.manual_type,
        isManual: true,
      }])
  ).values()];

  const camps = [...linkedCamps, ...manualAlbums.filter(m => m.manual_type === 'Camp')];
  const regularEvents = [...linkedEvents, ...manualAlbums.filter(m => m.manual_type === 'Event' || !m.manual_type)];
  const meetings = [...linkedMeetings, ...manualAlbums.filter(m => m.manual_type === 'Meeting')];

  const getDisplayPhotos = () => {
    if (selectedItem) {
      if (selectedItem.isManual) return allPhotos.filter(p => p.manual_event_name === selectedItem.title && (p.manual_date || '') === (selectedItem.date || ''));
      return allPhotos.filter(p => p.event_id === selectedItem.id || p.programme_id === selectedItem.id);
    }
    return [...allPhotos].sort(() => Math.random() - 0.5);
  };
  const allDisplayPhotos = getDisplayPhotos();
  const displayPhotos = allDisplayPhotos.slice(0, displayCount);
  const hasMore = allDisplayPhotos.length > displayCount;
  const getItemPhoto = (item, type) => {
    if (item.isManual) return allPhotos.find(p => p.manual_event_name === item.title && (p.manual_date || '') === (item.date || ''))?.file_url;
    return type === 'meeting' ? allPhotos.find(p => p.programme_id === item.id)?.file_url : allPhotos.find(p => p.event_id === item.id)?.file_url;
  };
  const getItemPhotoCount = (item, type) => {
    if (item.isManual) return allPhotos.filter(p => p.manual_event_name === item.title && (p.manual_date || '') === (item.date || '')).length;
    return type === 'meeting' ? allPhotos.filter(p => p.programme_id === item.id).length : allPhotos.filter(p => p.event_id === item.id).length;
  };

  const tabBtn = (label, active, onClick) => (
    <button onClick={onClick} style={{ padding: '8px 20px', borderRadius: '25px', border: '1px solid', borderColor: active ? 'transparent' : 'rgba(26,26,46,0.2)', background: active ? '#7413dc' : 'transparent', color: active ? '#fff' : 'rgba(26,26,46,0.65)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
  );

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');`}</style>
      <SEO title="Gallery | 40th Rochdale (Syke) Scouts" description="View photos from our scout activities, camps, and events." path="/Gallery" />
      <FloatingNav />
      <NavBarSpacer />

      {/* Hero */}
      <section style={{ background: '#f8f7ff', padding: '80px 32px 60px', borderBottom: '1px solid rgba(116,19,220,0.1)' }}>
        <div style={{ maxWidth: '800px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '12px' }}>Adventures in pictures</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', color: '#1a1a2e', margin: '0 0 16px' }}>{selectedItem ? (selectedItem.title || 'Event Photos') : 'Photo Gallery'}</h1>
          <p style={{ fontSize: '17px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75, margin: 0 }}>Browse photos from our adventures.</p>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 32px' }}>
        {/* Section filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
          {[{ id: 'all', label: 'All Sections' }, ...['beavers', 'cubs', 'scouts'].map(name => sections.find(s => s.name === name)).filter(Boolean).map(s => ({ id: s.id, label: s.display_name }))].map(opt => (
            <button key={opt.id} onClick={() => { setSelectedSection(opt.id); setSelectedItem(null); }} style={{ padding: '7px 18px', borderRadius: '25px', border: '1px solid', borderColor: selectedSection === opt.id ? 'transparent' : 'rgba(26,26,46,0.2)', background: selectedSection === opt.id ? '#7413dc' : 'transparent', color: selectedSection === opt.id ? '#fff' : 'rgba(26,26,46,0.65)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
          {tabBtn(`All Photos`, view === 'all', () => { setView('all'); setSelectedItem(null); window.history.pushState({}, '', createPageUrl('Gallery')); })}
          {tabBtn(`Camps (${camps.length})`, view === 'camps', () => { setView('camps'); setSelectedItem(null); window.history.pushState({}, '', createPageUrl('Gallery') + '?view=camp'); })}
          {tabBtn(`Events (${regularEvents.length})`, view === 'events', () => { setView('events'); setSelectedItem(null); window.history.pushState({}, '', createPageUrl('Gallery') + '?view=event'); })}
          {tabBtn(`Meetings (${meetings.length})`, view === 'meetings', () => { setView('meetings'); setSelectedItem(null); window.history.pushState({}, '', createPageUrl('Gallery') + '?view=meeting'); })}
        </div>

        {selectedItem && (
          <button onClick={() => { setSelectedItem(null); window.history.pushState({}, '', createPageUrl('Gallery') + `?view=${viewParam}`); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(116,19,220,0.06)', border: '1px solid rgba(116,19,220,0.15)', borderRadius: '25px', padding: '8px 18px', color: '#7413dc', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', marginBottom: '28px' }}>
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}><Loader2 size={48} color="#7413dc" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} /><p style={{ color: 'rgba(26,26,46,0.5)' }}>Loading photos...</p></div>
        ) : displayPhotos.length === 0 && (view === 'all' || selectedItem) ? (
          <div style={{ ...glassCard, padding: '60px', textAlign: 'center' }}>
            <ImageIcon size={48} color="rgba(116,19,220,0.2)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e', marginBottom: '8px' }}>No photos yet</h3>
            <p style={{ color: 'rgba(26,26,46,0.4)' }}>Check back soon for event photos!</p>
          </div>
        ) : view === 'all' || selectedItem ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              <AnimatePresence>
                {displayPhotos.map((photo, index) => (
                  <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    onClick={() => { setLightboxPhoto(photo); setLightboxOpen(true); }}
                    style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
                    className="group"
                  >
                    <LazyImage src={photo.file_url} alt={photo.caption || ''} className="w-full h-full" style={{ objectFit: 'cover', width: '100%', height: '100%', transition: 'transform 0.4s ease' }} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <button onClick={() => setDisplayCount(prev => prev + 30)} style={{ background: '#7413dc', color: '#fff', border: 'none', borderRadius: '30px', padding: '13px 28px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', cursor: 'pointer' }}>
                  Load More Photos ({allDisplayPhotos.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            {(view === 'camps' ? camps : view === 'events' ? regularEvents : meetings).map((item) => {
              const type = view === 'meetings' ? 'meeting' : view;
              const photo = getItemPhoto(item, type);
              const count = getItemPhotoCount(item, type);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => { setSelectedItem(item); if (!item.isManual) window.history.pushState({}, '', createPageUrl('Gallery') + `?view=${view === 'camps' ? 'camp' : view === 'events' ? 'event' : 'meeting'}&id=${item.id}`); }}
                  style={{ position: 'relative', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer' }}
                >
                  {photo ? <img src={photo} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'rgba(116,19,220,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={40} color="rgba(255,255,255,0.3)" /></div>}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
                      <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>{item.title}</h3>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{count} photos</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0">
          {lightboxPhoto && (
            <div style={{ background: '#1a1a2e' }}>
              <img src={lightboxPhoto.file_url} alt={lightboxPhoto.caption || ''} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
              {lightboxPhoto.caption && <div style={{ padding: '16px 24px', background: '#1a1a2e' }}><p style={{ color: '#fff', fontFamily: 'DM Sans, sans-serif', margin: 0 }}>{lightboxPhoto.caption}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PublicFooter />
    </div>
  );
}