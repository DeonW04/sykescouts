import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Shows a full-screen GIF overlay immediately on first visit per session.
 * - Appears instantly, covering any auth/loading spinners beneath it
 * - Stays visible until BOTH the GIF duration has elapsed AND pageReady is true
 * - If pageReady is still false when duration ends, it freezes on the last frame
 *   until pageReady becomes true, then fades out
 * 
 * Props:
 *   sessionKey  - unique string per page (e.g. 'home', 'leader_portal')
 *   duration    - how long to show the GIF in ms (default 6000)
 *   pageReady   - pass true when the page has finished loading
 */
export default function LoadingScreen({ sessionKey, duration = 6000, pageReady = true }) {
  const storageKey = `loading_shown_${sessionKey}`;
  const alreadyShown = sessionStorage.getItem(storageKey);

  const [visible, setVisible] = useState(!alreadyShown);
  const [gifUrl, setGifUrl] = useState(null);
  const [gifSize, setGifSize] = useState(60);
  const [fading, setFading] = useState(false);

  const timerDone = useRef(false);

  useEffect(() => {
    if (alreadyShown) return;

    sessionStorage.setItem(storageKey, '1');

    // Fetch GIF and size config in parallel
    base44.entities.WebsiteImage.filter({ page: 'loading_gif' })
      .then(imgs => { if (imgs?.[0]) setGifUrl(imgs[0].image_url); })
      .catch(() => {});

    base44.entities.WebsiteImage.filter({ page: 'loading_gif_config' })
      .then(configs => { if (configs?.[0]) setGifSize(configs[0].order || 60); })
      .catch(() => {});

    // After duration, mark timer as done — but only hide if page is also ready
    const timer = setTimeout(() => {
      timerDone.current = true;
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  // Watch for BOTH conditions: timer done AND page ready
  useEffect(() => {
    if (alreadyShown || !visible) return;

    if (timerDone.current && pageReady) {
      startFadeOut();
    }
  });

  // Poll every 100ms to check if both conditions are met
  useEffect(() => {
    if (alreadyShown || !visible) return;

    const interval = setInterval(() => {
      if (timerDone.current && pageReady) {
        clearInterval(interval);
        startFadeOut();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [pageReady, visible]);

  const startFadeOut = () => {
    setFading(true);
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      {gifUrl ? (
        <img
          src={gifUrl}
          alt="Loading..."
          style={{ width: `${gifSize}%`, maxHeight: `${gifSize}vh`, objectFit: 'contain' }}
        />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#7413dc] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      )}
    </div>
  );
}