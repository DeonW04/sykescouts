import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import ImageSelector from '../pageBuilder/ImageSelector';

const GRADIENT_OPTIONS = [
  { label: 'Orange to Red', value: 'from-orange-500 to-red-600', preview: 'linear-gradient(to right, #f97316, #dc2626)' },
  { label: 'Blue to Cyan', value: 'from-blue-500 to-cyan-600', preview: 'linear-gradient(to right, #3b82f6, #0891b2)' },
  { label: 'Purple to Pink', value: 'from-purple-500 to-pink-600', preview: 'linear-gradient(to right, #a855f7, #db2777)' },
  { label: 'Green to Teal', value: 'from-green-500 to-teal-600', preview: 'linear-gradient(to right, #22c55e, #0d9488)' },
  { label: 'Indigo to Purple', value: 'from-indigo-500 to-purple-600', preview: 'linear-gradient(to right, #6366f1, #9333ea)' },
  { label: 'Yellow to Orange', value: 'from-yellow-500 to-orange-600', preview: 'linear-gradient(to right, #eab308, #ea580c)' },
];

const SOLID_COLORS = [
  { label: 'Blue', value: 'bg-blue-600', preview: '#2563eb' },
  { label: 'Purple', value: 'bg-purple-600', preview: '#9333ea' },
  { label: 'Green', value: 'bg-green-600', preview: '#16a34a' },
  { label: 'Red', value: 'bg-red-600', preview: '#dc2626' },
  { label: 'Orange', value: 'bg-orange-600', preview: '#ea580c' },
  { label: 'Pink', value: 'bg-pink-600', preview: '#db2777' },
];

export default function HeaderBarConfig({ page, onUpdate }) {
  const [mode, setMode] = useState(page?.header_config?.mode || 'gradient');
  const [selectedStyle, setSelectedStyle] = useState(page?.header_config?.style || 'from-orange-500 to-red-600');
  const [imageUrl, setImageUrl] = useState(page?.header_config?.imageUrl || '');

  const handleSave = async () => {
    const config = {
      mode,
      style: mode === 'image' ? '' : selectedStyle,
      imageUrl: mode === 'image' ? imageUrl : '',
    };

    await onUpdate({ header_config: config });
    toast.success('Header bar updated');
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Header Bar Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'solid' ? 'default' : 'outline'}
            onClick={() => setMode('solid')}
            className="flex-1"
          >
            <Palette className="w-4 h-4 mr-2" />
            Solid Color
          </Button>
          <Button
            variant={mode === 'gradient' ? 'default' : 'outline'}
            onClick={() => setMode('gradient')}
            className="flex-1"
          >
            <Palette className="w-4 h-4 mr-2" />
            Gradient
          </Button>
          <Button
            variant={mode === 'image' ? 'default' : 'outline'}
            onClick={() => setMode('image')}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Image
          </Button>
        </div>

        {/* Solid Colors */}
        {mode === 'solid' && (
          <div className="grid grid-cols-3 gap-3">
            {SOLID_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedStyle(color.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedStyle === color.value ? 'border-blue-600 shadow-lg' : 'border-gray-200'
                }`}
              >
                <div
                  className="w-full h-12 rounded mb-2"
                  style={{ backgroundColor: color.preview }}
                />
                <p className="text-xs font-medium text-center">{color.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Gradients */}
        {mode === 'gradient' && (
          <div className="grid grid-cols-2 gap-3">
            {GRADIENT_OPTIONS.map((gradient) => (
              <button
                key={gradient.value}
                onClick={() => setSelectedStyle(gradient.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedStyle === gradient.value ? 'border-blue-600 shadow-lg' : 'border-gray-200'
                }`}
              >
                <div
                  className="w-full h-12 rounded mb-2"
                  style={{ background: gradient.preview }}
                />
                <p className="text-xs font-medium text-center">{gradient.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Image Upload */}
        {mode === 'image' && (
          <div className="space-y-3">
            <ImageSelector onSelect={(url) => setImageUrl(url)} isMultiple={false} />
            {imageUrl && (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Header preview"
                  className="w-full h-32 object-cover rounded"
                  style={{ objectPosition: 'center' }}
                />
                <p className="text-xs text-gray-500 mt-2">
                  This image will be cropped to fit the header bar
                </p>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
          Apply Header Style
        </Button>
      </CardContent>
    </Card>
  );
}