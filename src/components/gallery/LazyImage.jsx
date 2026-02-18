import React, { useRef, useState, useEffect } from 'react';

/**
 * LazyImage - only loads the image when it enters the viewport.
 * Shows a grey placeholder until then, then loads the image at low quality
 * (small rendered size). Full res is shown in lightbox via onClick.
 */
export default function LazyImage({ src, alt, className, onClick }) {
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`bg-gray-200 ${className || ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {inView && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          // Render at small size so browser downloads a lower-res version faster
          width="400"
        />
      )}
    </div>
  );
}