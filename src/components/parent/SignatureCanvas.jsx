import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Reusable draw-your-signature canvas with Clear/Submit controls.
// onSubmit receives the signature as a PNG data URL.
export default function SignatureCanvas({ onSubmit, submitting, height = '180px' }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e, canvasRef.current);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-gray-50" style={{ height, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-300 text-sm font-medium">Sign here →</p>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={clearCanvas} className="flex-1">Clear</Button>
        <Button
          onClick={() => onSubmit(canvasRef.current.toDataURL('image/png'))}
          disabled={!hasSignature || submitting}
          className="flex-1 bg-[#004851] hover:bg-[#003840]"
        >
          {submitting ? 'Submitting...' : 'Submit Signature'}
        </Button>
      </div>
    </div>
  );
}