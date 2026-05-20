import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GalleryUpload() {
  const params = new URLSearchParams(window.location.search);
  const meetingId = params.get('meeting');
  const eventId = params.get('event');

  const [authChecking, setAuthChecking] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      } else {
        setAuthChecking(false);
      }
    });
  }, []);

  if (!meetingId && !eventId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-500">Invalid link — no meeting or event specified.</p>
        </div>
      </div>
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7413dc] animate-spin" />
      </div>
    );
  }

  const handleFiles = async (files) => {
    const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!fileArr.length) return;
    setUploading(true);
    setDone(false);
    setProgress({ done: 0, total: fileArr.length });
    let count = 0;

    for (const file of fileArr) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.functions.invoke('createPublicGalleryPhoto', {
          file_url,
          meeting_id: meetingId || undefined,
          event_id: eventId || undefined,
        });
        if (res.data?.error) throw new Error(res.data.error);
        count++;
        setProgress(p => ({ ...p, done: count }));
      } catch (err) {
        toast.error(`Failed: ${err.message}`);
      }
    }

    setUploading(false);
    if (count > 0) {
      setUploadedCount(count);
      setDone(true);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#7413dc] text-white py-5 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
            alt="Syke Scouts" className="h-10 w-auto"
          />
          <div>
            <h1 className="text-lg font-bold">Upload Photos</h1>
            <p className="text-purple-200 text-sm">40th Rochdale (Syke) Scouts</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-8 flex-1 flex flex-col gap-6">
        {done ? (
          <div className="text-center py-12 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {uploadedCount} photo{uploadedCount !== 1 ? 's' : ''} uploaded!
              </h2>
              <p className="text-slate-500 mt-1">Thank you — your photos are awaiting approval by a leader.</p>
            </div>
            <Button
              onClick={() => {
                setDone(false);
                setProgress({ done: 0, total: 0 });
                setUploadedCount(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white"
            >
              Upload More Photos
            </Button>
          </div>
        ) : uploading ? (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-[#7413dc] mx-auto animate-spin" />
            <div>
              <h2 className="text-lg font-semibold text-slate-700">Uploading photos…</h2>
              <p className="text-slate-500 mt-1">{progress.done} of {progress.total} done</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 max-w-xs mx-auto overflow-hidden">
              <div
                className="bg-[#7413dc] h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
              📸 Upload photos from today's session — they'll be reviewed before appearing in the gallery.
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragging ? 'border-[#7413dc] bg-purple-50' : 'border-slate-300 bg-white hover:border-[#7413dc] hover:bg-purple-50'
              }`}
            >
              <ImagePlus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-700 font-semibold text-lg">Tap to select photos</p>
              <p className="text-slate-400 text-sm mt-1">or drag and drop here</p>
              <p className="text-slate-400 text-xs mt-3">JPG, PNG, HEIC accepted</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white w-full py-6 text-base gap-2"
            >
              <Upload className="w-5 h-5" /> Choose Photos
            </Button>
          </>
        )}

        <p className="text-center text-xs text-slate-400 mt-auto pt-4">
          Photos are reviewed by a leader before appearing in the gallery. · 40th Rochdale (Syke) Scouts
        </p>
      </div>
    </div>
  );
}