import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Plus, GripVertical, Image, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ────────────────────────────────────────────────────────────────────

function UploadButton({ onUpload, uploading, label = 'Upload image', id }) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => document.getElementById(id).click()}
        className="border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        <Upload className="w-3.5 h-3.5 mr-1.5" />
        {uploading ? 'Uploading…' : label}
      </Button>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files[0]; if (f) onUpload(f); e.target.value = ''; }}
      />
    </>
  );
}

// ── Section 1: Hero slideshow ──────────────────────────────────────────────────

function HeroImages({ images, onUpload, onDelete, onReorder, uploading }) {
  const [dragIdx, setDragIdx] = useState(null);

  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onReorder(reordered);
    setDragIdx(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Image className="w-5 h-5" />
          Hero — Slideshow Images
        </CardTitle>
        <p className="text-sm text-gray-500">
          These photos crossfade behind the hero headline. Drag to reorder — the slideshow plays in the order shown. Minimum 1 image required.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((img, idx) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className="flex items-center gap-3 p-2 rounded-lg border border-purple-100 bg-white hover:border-purple-300 transition-colors"
          >
            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />
            <img src={img.image_url} alt="" className="w-20 h-14 object-cover rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Slot {idx + 1}</p>
              <p className="text-xs text-gray-400 truncate">{img.image_url.split('/').pop()}</p>
            </div>
            <button
              onClick={() => {
                if (sorted.length <= 1) { toast.error('You must keep at least one hero image.'); return; }
                onDelete(img.id);
              }}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="border-2 border-dashed border-purple-200 rounded-lg p-8 text-center">
            <Image className="w-8 h-8 text-purple-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No hero images yet. Upload at least one.</p>
          </div>
        )}

        <UploadButton
          id="hero-upload"
          onUpload={(f) => onUpload('hero', f, sorted.length)}
          uploading={uploading}
          label="+ Add image"
        />
      </CardContent>
    </Card>
  );
}

// ── Section 2: Sticky scroll activities ───────────────────────────────────────

function ActivityRow({ activity, idx, total, onUpdate, onDelete, onReorder, uploading, onUploadImage }) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('activityIdx', idx)}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const from = parseInt(e.dataTransfer.getData('activityIdx')); onReorder(from, idx); }}
      className={`rounded-xl border transition-all ${dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />
        <span className="text-xs font-mono font-bold text-purple-400 w-6 flex-shrink-0">{String(idx + 1).padStart(2, '0')}</span>
        {activity.image_url && (
          <img src={activity.image_url} alt="" className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
        )}
        <span className="flex-1 font-medium text-sm text-gray-800 truncate">{activity.title || <em className="text-gray-400">Untitled activity</em>}</span>
        <span className="text-xs text-gray-400 mr-2">{open ? '▲' : '▼'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); if (total <= 1) { toast.error('You must keep at least one activity.'); return; } if (confirm('Remove this activity from the website?')) onDelete(); }}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Activity title <span className="text-gray-400">(1–4 words recommended, max 30 chars)</span>
            </label>
            <input
              maxLength={30}
              value={activity.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="e.g. Rock climbing"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Short description <span className="text-gray-400">(2–3 sentences, max 200 chars)</span>
            </label>
            <textarea
              maxLength={200}
              rows={3}
              value={activity.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Speak directly to a parent about what their child experiences…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-purple-400"
            />
            <p className="text-xs text-gray-400 mt-0.5">{(activity.description || '').length}/200</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Activity photo <span className="text-gray-400">(portrait preferred, min 800px tall)</span>
            </label>
            {activity.image_url ? (
              <div className="flex items-start gap-3">
                <img src={activity.image_url} alt="" className="w-24 h-32 object-cover rounded-lg border border-gray-200" />
                <UploadButton
                  id={`activity-img-${idx}`}
                  onUpload={(f) => onUploadImage(f)}
                  uploading={uploading}
                  label="Replace photo"
                />
              </div>
            ) : (
              <UploadButton
                id={`activity-img-${idx}`}
                onUpload={(f) => onUploadImage(f)}
                uploading={uploading}
                label="Upload photo"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivitiesConfig({ activities, onUpdateActivity, onDeleteActivity, onAddActivity, onReorderActivity, uploading, onUploadActivityImage }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Image className="w-5 h-5" />
          Sticky Scroll — Activities List
        </CardTitle>
        <p className="text-sm text-gray-500">
          Controls the scrolling section on the home page — the activity titles, descriptions, and photos. Drag to reorder. Min 1 activity required.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((act, idx) => (
          <ActivityRow
            key={act.id}
            activity={act}
            idx={idx}
            total={activities.length}
            onUpdate={(changes) => onUpdateActivity(act.id, changes)}
            onDelete={() => onDeleteActivity(act.id)}
            onReorder={onReorderActivity}
            uploading={uploading}
            onUploadImage={(f) => onUploadActivityImage(act.id, f)}
          />
        ))}

        {activities.length === 0 && (
          <div className="border-2 border-dashed border-purple-200 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-400">No activities configured. Add one below.</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddActivity}
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          + Add activity
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Section 3 & 4: Fixed image slots ──────────────────────────────────────────

function FixedImageSlot({ label, hint, image, onUpload, onDelete, uploading, uploadId }) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-white space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      {image ? (
        <div className="relative group w-fit">
          <img src={image.image_url} alt={label} className="h-40 w-auto object-cover rounded-lg border border-gray-200" />
          <button
            onClick={() => onDelete(image.id)}
            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="h-32 w-48 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400 text-center px-3">No image — upload one</p>
        </div>
      )}
      <UploadButton
        id={uploadId}
        onUpload={onUpload}
        uploading={uploading}
        label={image ? 'Replace image' : 'Upload image'}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PublicWebsiteSettings() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: allImages = [] } = useQuery({
    queryKey: ['website-images-public'],
    queryFn: () => base44.entities.WebsiteImage.list(),
  });

  // Filtered sets
  const heroImages = allImages.filter(i => i.page === 'hero').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const activityImages = allImages.filter(i => i.page === 'activities').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const getFixed = (page, label) => allImages.find(i => i.page === page && i.label === label);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['website-images-public'] });
    queryClient.invalidateQueries({ queryKey: ['website-images'] });
  };

  // ── Generic upload helper ─────────────────────────────────────────────────
  const uploadFile = async (file) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  // ── Hero ──────────────────────────────────────────────────────────────────
  const handleHeroUpload = async (page, file, order) => {
    setUploading(true);
    try {
      const file_url = await uploadFile(file);
      await base44.entities.WebsiteImage.create({ page: 'hero', image_url: file_url, order });
      invalidate();
      toast.success('Hero image added');
    } catch (e) { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleHeroDelete = async (id) => {
    await base44.entities.WebsiteImage.delete(id);
    invalidate();
    toast.success('Image removed');
  };

  const handleHeroReorder = async (reorderedList) => {
    await Promise.all(reorderedList.map((img, idx) => base44.entities.WebsiteImage.update(img.id, { order: idx })));
    invalidate();
  };

  // ── Activities ────────────────────────────────────────────────────────────
  const handleAddActivity = async () => {
    await base44.entities.WebsiteImage.create({ page: 'activities', image_url: '', title: '', description: '', order: activityImages.length });
    invalidate();
  };

  const handleUpdateActivity = async (id, changes) => {
    await base44.entities.WebsiteImage.update(id, changes);
    invalidate();
  };

  const handleDeleteActivity = async (id) => {
    await base44.entities.WebsiteImage.delete(id);
    invalidate();
    toast.success('Activity removed');
  };

  const handleReorderActivity = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const reordered = [...activityImages];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await Promise.all(reordered.map((img, idx) => base44.entities.WebsiteImage.update(img.id, { order: idx })));
    invalidate();
  };

  const handleUploadActivityImage = async (id, file) => {
    setUploading(true);
    try {
      const file_url = await uploadFile(file);
      await base44.entities.WebsiteImage.update(id, { image_url: file_url });
      invalidate();
      toast.success('Activity photo updated');
    } catch (e) { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  // ── Fixed slots ───────────────────────────────────────────────────────────
  const handleFixedUpload = async (page, label, file) => {
    setUploading(true);
    try {
      const existing = getFixed(page, label);
      if (existing) await base44.entities.WebsiteImage.delete(existing.id);
      const file_url = await uploadFile(file);
      await base44.entities.WebsiteImage.create({ page, label, image_url: file_url, order: 0 });
      invalidate();
      toast.success('Image updated');
    } catch (e) { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleFixedDelete = async (id) => {
    await base44.entities.WebsiteImage.delete(id);
    invalidate();
    toast.success('Image removed');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h2 className="text-lg font-bold text-purple-900 mb-1">Public Website Settings</h2>
        <p className="text-sm text-purple-700">
          Everything in this section controls what visitors see on the public-facing website. Changes take effect immediately — no code changes required.
        </p>
      </div>

      {/* Section 1 */}
      <HeroImages
        images={heroImages}
        onUpload={handleHeroUpload}
        onDelete={handleHeroDelete}
        onReorder={handleHeroReorder}
        uploading={uploading}
      />

      {/* Section 2 */}
      <ActivitiesConfig
        activities={activityImages}
        onUpdateActivity={handleUpdateActivity}
        onDeleteActivity={handleDeleteActivity}
        onAddActivity={handleAddActivity}
        onReorderActivity={handleReorderActivity}
        uploading={uploading}
        onUploadActivityImage={handleUploadActivityImage}
      />

      {/* Section 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Image className="w-5 h-5" />
            Sections — Background Images
          </CardTitle>
          <p className="text-sm text-gray-500">
            The background photo inside each section hover-panel on the home page. A colour tint is applied on top automatically.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Beavers', page: 'sections', slug: 'beavers' },
            { label: 'Cubs', page: 'sections', slug: 'cubs' },
            { label: 'Scouts', page: 'sections', slug: 'scouts' },
          ].map(({ label, page, slug }) => (
            <FixedImageSlot
              key={slug}
              label={`${label} section background image`}
              hint={`Upload a background photo for the ${label} panel.`}
              image={getFixed(page, slug)}
              onUpload={(f) => handleFixedUpload(page, slug, f)}
              onDelete={handleFixedDelete}
              uploading={uploading}
              uploadId={`section-${slug}-upload`}
            />
          ))}
        </CardContent>
      </Card>

      {/* Section 4 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Image className="w-5 h-5" />
            Join & Volunteer CTA — Background Images
          </CardTitle>
          <p className="text-sm text-gray-500">
            Background photos for the split Join/Volunteer panel near the bottom of the home page. A coloured overlay is applied automatically — any photo works regardless of colour scheme.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FixedImageSlot
            label="Join CTA — background image"
            hint="Left half, purple tint overlay. Recommended: a group photo showing community."
            image={getFixed('cta', 'join')}
            onUpload={(f) => handleFixedUpload('cta', 'join', f)}
            onDelete={handleFixedDelete}
            uploading={uploading}
            uploadId="cta-join-upload"
          />
          <FixedImageSlot
            label="Volunteer CTA — background image"
            hint="Right half, teal tint overlay. Recommended: a leader and young person working together."
            image={getFixed('cta', 'volunteer')}
            onUpload={(f) => handleFixedUpload('cta', 'volunteer', f)}
            onDelete={handleFixedDelete}
            uploading={uploading}
            uploadId="cta-volunteer-upload"
          />
        </CardContent>
      </Card>
    </div>
  );
}