import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Shows a full-screen GIF overlay on first visit to a page per session.
 * sessionKey: unique string per page (e.g. 'home', 'leader_portal', 'parent_portal')
 * duration: how long to show it in ms (default matches GIF at ~6s)
 */
export default function LoadingScreen({ sessionKey, duration = 6000 }) {
  const storageKey = `loading_shown_${sessionKey}`;
  const alreadyShown = sessionStorage.getItem(storageKey);

  const [visible, setVisible] = useState(!alreadyShown);
  const [gifUrl, setGifUrl] = useState(null);
  const [gifSize, setGifSize] = useState(60); // percentage of viewport
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (alreadyShown) return;

    // Fetch GIF URL and size config
    base44.entities.WebsiteImage.filter({ page: 'loading_gif' }).then(imgs => {
      if (imgs && imgs.length > 0) setGifUrl(imgs[0].image_url);
    }).catch(() => {});

    base44.entities.WebsiteImage.filter({ page: 'loading_gif_config' }).then(configs => {
      if (configs && configs.length > 0) setGifSize(configs[0].order || 60);
    }).catch(() => {});

    sessionStorage.setItem(storageKey, '1');

    const fadeTimer = setTimeout(() => setFading(true), duration - 400);
    const hideTimer = setTimeout(() => setVisible(false), duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-400"
      style={{ opacity: fading ? 0 : 1 }}
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