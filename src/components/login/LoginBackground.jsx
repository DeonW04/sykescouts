import React, { useState, useEffect } from 'react';

/**
 * Renders a configurable login background.
 * - 0 images: gradient fallback
 * - 1 image: static
 * - 2+ images: crossfade slideshow
 */
export default function LoginBackground({ images = [], intervalSeconds = 6 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, Math.max(3, intervalSeconds) * 1000);
    return () => clearInterval(id);
  }, [images, intervalSeconds]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      {/* Gradient base — always present as a fallback */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #7413dc 0%, #004851 100%)',
      }} />

      {images.map((src, i) => (
        <div
          key={src + i}
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === index ? 1 : 0,
            transition: 'opacity 1.2s ease-in-out',
          }}
        />
      ))}

      {/* Dark overlay for legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(20,10,40,0.55) 0%, rgba(20,10,40,0.7) 100%)',
      }} />
    </div>
  );
}