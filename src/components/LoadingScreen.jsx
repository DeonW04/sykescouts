import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Shows a full-screen GIF overlay on first visit per session.
 * Stays visible until BOTH the minimum duration has elapsed AND pageReady is true.
 */
export default function LoadingScreen({ sessionKey, duration = 6000, pageReady = true }) {
  const storageKey = `loading_shown_${sessionKey}`;
  const alreadyShown = sessionStorage.getItem(storageKey);

  const [visible, setVisible] = useState(!alreadyShown);
  const [fading, setFading] = useState(false);
  const [gifUrl, setGifUrl] = useState(null);
  const [gifSize, setGifSize] = useState(60);

  const timerDoneRef = useRef(false);
  const pageReadyRef = useRef(pageReady);
  const dismissedRef = useRef(false);

  const tryDismiss = () => {
    if (dismissedRef.current) return;
    if (!timerDoneRef.current) return;
    if (!pageReadyRef.current) return;
    dismissedRef.current = true;
    setFading(true);
    setTimeout(() => setVisible(false), 400);
  };

  // Keep pageReadyRef in sync and try to dismiss whenever pageReady flips to true
  useEffect(() => {
    pageReadyRef.current = pageReady;
    if (!alreadyShown) tryDismiss();
  }, [pageReady]);

  // On mount: mark session, fetch GIF config, start minimum-duration timer
  useEffect(() => {
    if (alreadyShown) return;

    sessionStorage.setItem(storageKey, '1');

    base44.entities.WebsiteImage.filter({ page: 'loading_gif' })
      .then(imgs => { if (imgs?.[0]) setGifUrl(imgs[0].image_url); })
      .catch(() => {});

    base44.entities.WebsiteImage.filter({ page: 'loading_gif_config' })
      .then(configs => { if (configs?.[0]) setGifSize(configs[0].order || 60); })
      .catch(() => {});

    const timer = setTimeout(() => {
      timerDoneRef.current = true;
      tryDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease' }}
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