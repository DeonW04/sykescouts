import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, X, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function LeaderGallery({ sections, user }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [caption, setCaption] = useState('');
  const [previewUrls, setPreviewUrls] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const sectionIds = sections.map(s => s.id);

  const { data: programmes = [] } = useQuery({
    queryKey: ['leader-gallery-programmes', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Programme.filter({});
      return all.filter(p => sectionIds.includes(p.section_id)).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    },
    enabled: sectionIds.length > 0,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['leader-gallery-events', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({});
      return all.filter(e => e.section_ids?.some(sid => sectionIds.includes(sid))).sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).slice(0, 20);
    },
    enabled: sectionIds.length > 0,
  });

  const { data: recentPhotos = [] } = useQuery({
    queryKey: ['leader-gallery-photos', sectionIds],
    queryFn: async () => {
      const all = await base44.entities.EventPhoto.filter({});
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 12);
    },
  });

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles(files);
    setPreviewUrls(files.map(f => URL.createObjectURL(f)));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select photos first');
      return;
    }
    if (!selectedProgrammeId && !selectedEventId) {
      toast.error('Please link to a meeting or event');
      return;
    }

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.EventPhoto.create({
          file_url,
          caption,
          uploaded_by: user?.email,
          ...(selectedProgrammeId ? { programme_id: selectedProgrammeId } : {}),
          ...(selectedEventId ? { event_id: selectedEventId } : {}),
        });
      }
      toast.success(`${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded!`);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCaption('');
      setSelectedProgrammeId('');
      setSelectedEventId('');
      queryClient.invalidateQueries({ queryKey: ['leader-gallery-photos'] });
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-pink-600 to-rose-600 px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Gallery</h1>
        <p className="text-white/70 text-sm mt-1">Upload photos from meetings & events</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Upload card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <p className="font-bold text-gray-900 text-sm">Upload Photos</p>

          {/* File picker */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2 text-gray-400 active:bg-gray-50"
          >
            <Camera className="w-8 h-8" />
            <p className="text-sm font-medium">{selectedFiles.length > 0 ? `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} selected` : 'Tap to choose photos'}</p>
          </button>

          {/* Previews */}
          {previewUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  <button onClick={() => {
                    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
                    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                  }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link to meeting */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Link to Meeting</label>
            <select value={selectedProgrammeId} onChange={e => { setSelectedProgrammeId(e.target.value); setSelectedEventId(''); }} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 bg-white appearance-none">
              <option value="">Select a meeting...</option>
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{format(new Date(p.date), 'd MMM yyyy')} — {p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex-1 border-t border-gray-200" />
            <span>or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Link to event */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Link to Event</label>
            <select value={selectedEventId} onChange={e => { setSelectedEventId(e.target.value); setSelectedProgrammeId(''); }} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 bg-white appearance-none">
              <option value="">Select an event...</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.title} — {format(new Date(e.start_date), 'd MMM yyyy')}</option>
              ))}
            </select>
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Caption (optional)</label>
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400" />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full py-3.5 bg-pink-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}` : 'Photos'}</>
            )}
          </button>
        </div>

        {/* Recent photos */}
        {recentPhotos.length > 0 && (
          <div>
            <p className="font-bold text-gray-900 text-sm mb-3">Recently Uploaded</p>
            <div className="grid grid-cols-3 gap-2">
              {recentPhotos.map(photo => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img src={photo.file_url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}