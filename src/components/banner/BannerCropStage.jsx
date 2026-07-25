import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';

const ASPECT = 3; // banner width : height

export default function BannerCropStage({ imageUrl, onConfirm, onBack }) {
  const imgRef = useRef(null);
  const [dims, setDims] = useState(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const dragRef = useRef(null);

  const handleLoad = () => {
    const iw = imgRef.current.clientWidth, ih = imgRef.current.clientHeight;
    const bw = Math.min(iw, ih * ASPECT);
    const bh = bw / ASPECT;
    setDims({ iw, ih, bw, bh });
    setPos({ left: (iw - bw) / 2, top: (ih - bh) / 2 });
  };

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const onPointerDown = (e) => {
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, left: pos.left, top: pos.top };
    e.target.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current || !dims) return;
    setPos({
      left: clamp(dragRef.current.left + e.clientX - dragRef.current.x, 0, dims.iw - dims.bw),
      top: clamp(dragRef.current.top + e.clientY - dragRef.current.y, 0, dims.ih - dims.bh),
    });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const confirm = () => {
    if (!dims) return;
    const x = dims.iw - dims.bw > 1 ? Math.round((pos.left / (dims.iw - dims.bw)) * 100) : 50;
    const y = dims.ih - dims.bh > 1 ? Math.round((pos.top / (dims.ih - dims.bh)) * 100) : 50;
    onConfirm(`${x}% ${y}%`);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Drag the box to choose which part of the photo shows in the banner.</p>
      <div className="relative overflow-hidden rounded-lg select-none touch-none mx-auto" style={{ width: 'fit-content' }}>
        <img ref={imgRef} src={imageUrl} alt="" onLoad={handleLoad} className="max-h-[55vh] max-w-full block" draggable={false} />
        {dims && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute border-2 border-white rounded-sm cursor-move"
            style={{ left: pos.left, top: pos.top, width: dims.bw, height: dims.bh, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
          />
        )}
      </div>
      <div className="flex justify-between">
        <Button size="sm" variant="outline" onClick={onBack}><ArrowLeft className="w-3.5 h-3.5 mr-1" />Back</Button>
        <Button size="sm" onClick={confirm} className="bg-[#7413dc] hover:bg-[#5c0fb0]"><Check className="w-3.5 h-3.5 mr-1" />Use image</Button>
      </div>
    </div>
  );
}