import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Rotating hero-image background with a dark overlay, matching the public
// homepage hero. Used for the Welcome screen so it feels like part of the site.
export default function HeroBackdrop({ children }) {
  const [images, setImages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    base44.entities.WebsiteImage.filter({ page: 'hero' })
      .then(configs => setImages(configs.map(c => c.image_url).filter(Boolean)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    timerRef.current = setInterval(() => {
      setFading(true);
      setPrevIdx(currentIdx);
      setTimeout(() => {
        setCurrentIdx(i => (i + 1) % images.length);
        setFading(false);
        setPrevIdx(null);
      }, 1200);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [images, currentIdx]);

  const bgStyle = (url, active) => ({
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 1.2s ease',
    opacity: active ? 1 : 0,
  });

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {images.length > 0 ? (
        <>
          {prevIdx !== null && <div style={{ ...bgStyle(images[prevIdx], false), opacity: fading ? 0 : 1 }} />}
          <div style={bgStyle(images[currentIdx], true)} />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.75) 100%)' }}
      />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}