import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload } from 'lucide-react';
import BannerCropStage from './BannerCropStage';

export default function BannerPickerDialog({ open, onOpenChange, onComplete, allowUpload = false, sectionId = null, title = 'Choose a banner image' }) {
  const [album, setAlbum] = useState(null);
  const [cropUrl, setCropUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: photos = [] } = useQuery({
    queryKey: ['banner-gallery-photos'],
    queryFn: () => base44.entities.EventPhoto.filter({}),
    enabled: open,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['banner-gallery-events'],
    queryFn: () => base44.entities.Event.list('-start_date', 500),
    enabled: open,
  });
  const { data: programmes = [] } = useQuery({
    queryKey: ['banner-gallery-programmes'],
    queryFn: () => base44.entities.Programme.list('-date', 500),
    enabled: open,
  });

  const visiblePhotos = useMemo(
    () => photos.filter(p =>
      p.approval_status !== 'pending' &&
      p.visible_to !== 'leaders' &&
      (!sectionId || p.section_id === sectionId || p.section_id === 'all')
    ),
    [photos, sectionId]
  );

  // All camps/events/meetings combined, most recent first
  const albums = useMemo(() => {
    const map = new Map();
    for (const p of visiblePhotos) {
      let key, meta;
      if (p.event_id) {
        const ev = events.find(e => e.id === p.event_id);
        if (!ev) continue;
        key = `e-${p.event_id}`;
        meta = { title: ev.title, date: ev.start_date, type: ev.type || 'Event' };
      } else if (p.programme_id) {
        const pr = programmes.find(x => x.id === p.programme_id);
        if (!pr) continue;
        key = `p-${p.programme_id}`;
        meta = { title: pr.title, date: pr.date, type: 'Meeting' };
      } else {
        key = `m-${p.manual_event_name || 'Photos'}-${p.manual_date || ''}`;
        meta = { title: p.manual_event_name || 'Photos', date: p.manual_date, type: p.manual_type || 'Event' };
      }
      if (!map.has(key)) map.set(key, { key, ...meta, photos: [] });
      map.get(key).photos.push(p);
    }
    return [...map.values()].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [visiblePhotos, events, programmes]);

  const reset = () => { setAlbum(null); setCropUrl(null); };
  const handleOpenChange = (o) => { if (!o) reset(); onOpenChange(o); };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCropUrl(file_url);
    } finally { setUploading(false); }
  };

  const typeBadgeColor = (type) =>
    type === 'Camp' ? 'bg-green-100 text-green-700' : type === 'Meeting' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cropUrl ? 'Position your banner' : album ? album.title : title}</DialogTitle>
        </DialogHeader>

        {cropUrl ? (
          <BannerCropStage
            imageUrl={cropUrl}
            onBack={() => setCropUrl(null)}
            onConfirm={(position) => { onComplete(cropUrl, position); reset(); onOpenChange(false); }}
          />
        ) : album ? (
          <div className="space-y-3">
            <Button size="sm" variant="outline" onClick={() => setAlbum(null)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
            </Button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {album.photos.map(p => (
                <button
                  key={p.id}
                  onClick={() => setCropUrl(p.file_url)}
                  className="rounded-lg overflow-hidden border hover:ring-2 hover:ring-[#7413dc] transition-all"
                >
                  <img src={p.thumbnail_url || p.file_url} alt="" className="w-full h-32 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {albums.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No gallery photos available yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {albums.map(a => (
                  <button
                    key={a.key}
                    onClick={() => setAlbum(a)}
                    className="text-left rounded-xl overflow-hidden border hover:shadow-md transition-shadow bg-white"
                  >
                    <img src={a.photos[0].thumbnail_url || a.photos[0].file_url} alt="" className="w-full h-24 object-cover" loading="lazy" />
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-gray-800 truncate">{a.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${typeBadgeColor(a.type)}`}>{a.type}</span>
                        <span className="text-[10px] text-gray-400">
                          {a.date ? new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''} · {a.photos.length} photos
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {allowUpload && (
              <div className="border-t pt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">Can't find the right photo?</p>
                <Button size="sm" variant="outline" disabled={uploading} onClick={() => document.getElementById('banner-upload-input').click()}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />{uploading ? 'Uploading…' : 'Upload from device'}
                </Button>
                <input
                  id="banner-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files[0]; if (f) handleUpload(f); e.target.value = ''; }}
                />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}