import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const POSITIONS = [
  { key: 'left_sleeve_upper', label: 'Left Sleeve Upper' },
  { key: 'left_sleeve_lower', label: 'Left Sleeve Lower' },
  { key: 'right_sleeve',      label: 'Right Sleeve' },
  { key: 'left_chest_upper',  label: 'Left Chest Upper' },
  { key: 'left_chest_lower',  label: 'Left Chest Lower' },
  { key: 'right_chest_upper', label: 'Right Chest Upper' },
  { key: 'right_chest_lower', label: 'Right Chest Lower' },
];

const DEFAULT_POSITIONS = {
  left_sleeve_upper:  { x: 22, y: 38 },
  left_sleeve_lower:  { x: 22, y: 55 },
  right_sleeve:       { x: 78, y: 45 },
  left_chest_upper:   { x: 35, y: 30 },
  left_chest_lower:   { x: 35, y: 42 },
  right_chest_upper:  { x: 65, y: 30 },
  right_chest_lower:  { x: 65, y: 42 },
};

export default function UniformPositionEditor({ uniformConfig, onSave }) {
  const [dots, setDots] = useState(uniformConfig?.dot_positions || DEFAULT_POSITIONS);
  const [imageUrl, setImageUrl] = useState(uniformConfig?.image_url || '');
  const [exampleImages, setExampleImages] = useState(uniformConfig?.section_example_images || []);
  const [placingDot, setPlacingDot] = useState(null); // which position we're placing
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef(null);

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      toast.success('Uniform image uploaded');
    } catch (e) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleExampleUpload = async (position, file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updated = exampleImages.filter(i => i.position !== position);
      setExampleImages([...updated, { position, image_url: file_url, label: POSITIONS.find(p => p.key === position)?.label }]);
      toast.success('Example image uploaded');
    } catch (e) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = (e) => {
    if (!placingDot || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDots(prev => ({ ...prev, [placingDot]: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } }));
    setPlacingDot(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ image_url: imageUrl, dot_positions: dots, section_example_images: exampleImages });
      toast.success('Uniform config saved');
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Uniform image upload */}
      <div>
        <Label className="font-semibold">Uniform Diagram Image</Label>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" disabled={uploading} onClick={() => document.getElementById('uniform-img-upload').click()}>
            <Upload className="w-4 h-4 mr-2" /> {imageUrl ? 'Replace Image' : 'Upload Image'}
          </Button>
          <input id="uniform-img-upload" type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} />
        </div>
      </div>

      {/* Interactive dot placer */}
      {imageUrl && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Click a position button, then click on the image to place its dot:</p>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map(p => (
              <button
                key={p.key}
                onClick={() => setPlacingDot(placingDot === p.key ? null : p.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all
                  ${placingDot === p.key
                    ? 'bg-purple-600 text-white border-purple-600'
                    : dots[p.key] ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
              >
                {p.label} {dots[p.key] ? `(${Math.round(dots[p.key].x)}, ${Math.round(dots[p.key].y)})` : '(not set)'}
              </button>
            ))}
          </div>

          {placingDot && (
            <p className="text-sm text-purple-700 font-medium animate-pulse">
              👆 Click on the image to place: {POSITIONS.find(p => p.key === placingDot)?.label}
            </p>
          )}

          <div
            className="relative inline-block w-full"
            onClick={handleImageClick}
            style={{ cursor: placingDot ? 'crosshair' : 'default' }}
          >
            <img ref={imgRef} src={imageUrl} alt="Uniform" className="w-full rounded-xl object-contain" style={{ maxHeight: 400 }} />
            {POSITIONS.map(p => {
              const coord = dots[p.key];
              if (!coord) return null;
              return (
                <div
                  key={p.key}
                  style={{ left: `${coord.x}%`, top: `${coord.y}%`, transform: 'translate(-50%,-50%)' }}
                  className={`absolute w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow
                    ${placingDot === p.key ? 'bg-purple-500 border-purple-700 text-white' : 'bg-yellow-400 border-yellow-600 text-yellow-900'}`}
                  title={p.label}
                >
                  ●
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fine-tune X/Y */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {POSITIONS.map(p => (
          <div key={p.key} className="flex items-center gap-2 text-sm">
            <span className="w-36 text-gray-600 shrink-0">{p.label}</span>
            <Input
              type="number" step="0.1" min="0" max="100"
              value={dots[p.key]?.x ?? ''}
              onChange={e => setDots(prev => ({ ...prev, [p.key]: { ...prev[p.key], x: parseFloat(e.target.value) } }))}
              className="w-20 h-8 text-xs" placeholder="X %"
            />
            <Input
              type="number" step="0.1" min="0" max="100"
              value={dots[p.key]?.y ?? ''}
              onChange={e => setDots(prev => ({ ...prev, [p.key]: { ...prev[p.key], y: parseFloat(e.target.value) } }))}
              className="w-20 h-8 text-xs" placeholder="Y %"
            />
          </div>
        ))}
      </div>

      {/* Example images per position */}
      <div>
        <p className="font-semibold text-gray-700 mb-3">Example Photos (one per location)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {POSITIONS.map(p => {
            const ex = exampleImages.find(i => i.position === p.key);
            return (
              <div key={p.key} className="border rounded-lg p-2 space-y-1">
                <p className="text-xs font-medium text-gray-600">{p.label}</p>
                {ex ? (
                  <img src={ex.image_url} alt={p.label} className="w-full h-20 object-cover rounded" />
                ) : (
                  <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No image</div>
                )}
                <Button variant="outline" size="sm" className="w-full text-xs"
                  onClick={() => document.getElementById(`ex-${p.key}`).click()}>
                  <Upload className="w-3 h-3 mr-1" /> {ex ? 'Replace' : 'Upload'}
                </Button>
                <input id={`ex-${p.key}`} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files[0] && handleExampleUpload(p.key, e.target.files[0])} />
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-[#7413dc] hover:bg-[#5c0fb0] w-full">
        <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Uniform Config'}
      </Button>
    </div>
  );
}