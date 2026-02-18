import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage - loads a tiny blurred thumbnail first, then swaps in the full image on click or when entering viewport.
 * Props:
 *   src          - full resolution URL
 *   alt          - alt text
 *   className    - class for the <img> element
 *   onClick      - click handler
 *   loadFull     - if true, load full image immediately (e.g. lightbox)
 */
export default function LazyImage({ src, alt, className, onClick, loadFull = false }) {
  const [stage, setStage] = useState('thumb'); // 'thumb' | 'loading' | 'full'
  const imgRef = useRef(null);

  // Build a tiny thumbnail URL by appending width param (works for most CDNs; falls back gracefully)
  const thumbSrc = src ? `${src}?w=20&q=10` : src;

  // Use IntersectionObserver to trigger thumbnail load when card enters viewport
  useEffect(() => {
    if (!src) return;
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          // Preload the thumb
          const img = new Image();
          img.src = thumbSrc;
          img.onload = () => setStage(prev => prev === 'thumb' ? 'thumbLoaded' : prev);
          img.onerror = () => setStage('full'); // skip blur if thumb fails
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src, thumbSrc]);

  // If loadFull is requested (e.g. lightbox), skip straight to full
  useEffect(() => {
    if (loadFull && src) {
      setStage('full');
    }
  }, [loadFull, src]);

  const handleClick = () => {
    // On click, upgrade to full res if not already
    if (stage !== 'full') {
      setStage('loading');
      const img = new Image();
      img.src = src;
      img.onload = () => setStage('full');
      img.onerror = () => setStage('full');
    }
    if (onClick) onClick();
  };

  const showBlur = stage === 'thumb' || stage === 'thumbLoaded' || stage === 'loading';
  const displaySrc = stage === 'full' ? src : (stage === 'thumbLoaded' || stage === 'loading' ? thumbSrc : null);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-200 ${className || ''}`}
      onClick={handleClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {displaySrc && (
        <img
          src={displaySrc}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-500 ${showBlur ? 'blur-md scale-105' : 'blur-0 scale-100'}`}
        />
      )}
      {!displaySrc && (
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      )}
      {stage === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}