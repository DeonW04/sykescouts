import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_ACTIVITIES = [
  { title: 'DATA ERROR', description: 'A data error has occured! Please come back later!', image_url: '' },
];

export default function WhatWeDo() {
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    loadActivities();
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadActivities = async () => {
    try {
      const configs = await base44.entities.WebsiteImage.filter({ page: 'activities' });
      if (configs.length > 0) {
        const sorted = [...configs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setActivities(sorted.map(c => ({
          title: c.title || c.label || 'Activity',
          description: c.description || '',
          image_url: c.image_url || '',
        })));
      }
    } catch {}
  };

  useEffect(() => {
    if (isMobile) return;
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionHeight = sectionRef.current.offsetHeight;
      const scrollProgress = -rect.top / (sectionHeight - window.innerHeight);
      const clamped = Math.max(0, Math.min(1, scrollProgress));
      const newIdx = Math.min(activities.length - 1, Math.floor(clamped * activities.length));
      if (newIdx !== activeIdx) {
        setPrevIdx(activeIdx);
        setActiveIdx(newIdx);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activities.length, isMobile, activeIdx]);

  const progressPercent = activities.length > 0 ? ((activeIdx + 1) / activities.length) * 100 : 0;

  if (isMobile) {
    return (
      <section style={{ background: '#ffffff', padding: '80px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a855f7', marginBottom: '12px', textAlign: 'center' }}>
            What we actually do
          </p>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '28px', color: '#ffffff', textAlign: 'center', marginBottom: '32px' }}>
            Not what you'd expect.
          </h2>

          {activities[activeIdx]?.image_url ? (
            <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '24px', aspectRatio: '3/4', boxShadow: '0 40px 80px rgba(116,19,220,0.4), 0 20px 40px rgba(0, 0, 0, 0.8)' }}>
              <img src={activities[activeIdx].image_url} alt={activities[activeIdx].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '24px', aspectRatio: '3/4', background: `hsl(${activeIdx * 40 + 240},60%,20%)` }} />
          )}

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '28px', color: '#ffffff', marginBottom: '12px' }}>
              {activities[activeIdx]?.title}
            </h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75 }}>
              {activities[activeIdx]?.description}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={activeIdx === 0}
              style={{ padding: '10px 24px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: activeIdx === 0 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: activeIdx === 0 ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              ← Prev
            </button>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans, sans-serif', alignSelf: 'center', fontSize: '14px' }}>{activeIdx + 1} / {activities.length}</span>
            <button onClick={() => setActiveIdx(i => Math.min(activities.length - 1, i + 1))} disabled={activeIdx === activities.length - 1}
              style={{ padding: '10px 24px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: activeIdx === activities.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: activeIdx === activities.length - 1 ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Next →
            </button>
          </div>
        </div>
      </section>
    );
  }

  const sectionScrollHeight = `${activities.length * 120}vh`;

  return (
    <>
      <style>{`
        @keyframes cardCinemaIn {
          0%   { opacity: 0; transform: translateY(100px) scale(0.82) rotate(-3deg); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0px); }
          100% { opacity: 1; transform: translateY(-16px) scale(1.06) rotate(0deg); filter: blur(0px); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 80px rgba(116,19,220,0.5), 0 60px 120px rgba(0,0,0,0.9), 0 0 200px rgba(116,19,220,0.15); }
          50%       { box-shadow: 0 0 120px rgba(116,19,220,0.75), 0 60px 120px rgba(0,0,0,0.9), 0 0 280px rgba(116,19,220,0.25); }
        }
        @keyframes labelSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatGlow {
          0%, 100% { transform: scale(1) translateY(0); }
          50%       { transform: scale(1.15) translateY(-8px); }
        }
      `}</style>

      <section ref={sectionRef} style={{ background: '#000000ff', height: sectionScrollHeight, position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex' }}>

          {/* LEFT: navigation + description */}
          <div style={{ width: '40%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 56px 0 max(56px, calc((100vw - 1200px)/2 + 56px))', position: 'relative', zIndex: 2 }}>

            {/* Purple progress bar */}
            <div style={{ position: 'absolute', left: 'max(28px, calc((100vw - 1200px)/2 + 28px))', top: '18%', bottom: '18%', width: '3px', background: 'rgba(116,19,220,0.18)', borderRadius: '2px' }}>
              <div style={{ width: '100%', background: 'linear-gradient(to bottom, #a855f7, #7413dc)', borderRadius: '2px', height: `${progressPercent}%`, transition: 'height 0.5s ease', boxShadow: '0 0 12px rgba(116,19,220,0.8)' }} />
            </div>

            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a855f7', marginBottom: '36px' }}>
              What we actually do
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '48px' }}>
              {activities.map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0', transition: 'all 0.4s ease' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: i === activeIdx ? '#a855f7' : 'rgba(255,255,255,0.18)', minWidth: '26px', transition: 'color 0.4s' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: i === activeIdx ? 700 : 400,
                    fontSize: i === activeIdx ? '26px' : '20px',
                    color: i === activeIdx ? '#ffffff' : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.4s ease',
                    flex: 1,
                    lineHeight: 1.1,
                  }}>
                    {act.title}
                  </span>
                  <span style={{ color: '#a855f7', opacity: i === activeIdx ? 1 : 0, transition: 'opacity 0.4s', fontSize: '18px' }}>→</span>
                </div>
              ))}
            </div>

            {/* Description box */}
            <div key={activeIdx} style={{
              background: 'rgba(116,19,220,0.08)',
              border: '1px solid rgba(116,19,220,0.25)',
              borderRadius: '20px',
              padding: '24px 28px',
              animation: 'labelSlideUp 0.5s ease forwards',
            }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, margin: 0 }}>
                {activities[activeIdx]?.description}
              </p>
            </div>
          </div>

          {/* RIGHT: atmospheric card stage */}
          <div style={{
            width: '60%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse 80% 80% at 60% 50%, rgba(116,19,220,0.12) 0%, transparent 70%)',
          }}>
            {/* Atmospheric glow orb behind active card */}
            <div style={{
              position: 'absolute',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(116,19,220,0.18) 0%, transparent 70%)',
              animation: 'floatGlow 4s ease-in-out infinite',
              pointerEvents: 'none',
            }} />

            {/* Card stack container */}
            <div style={{ position: 'relative', width: '360px', height: '480px' }}>
              {activities.map((act, i) => {
                const offset = i - activeIdx;
                const isActive = i === activeIdx;
                const stackAngles = [-8, -3, 4, -2, 6, -5];
                const stackIdx = Math.abs(offset);

                let transform, opacity, zIndex, boxShadow, animationStyle = {};

                if (isActive) {
                  animationStyle = { animation: 'cardCinemaIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards, glowPulse 3s ease-in-out 0.9s infinite' };
                  transform = 'rotate(0deg) translateY(-16px) scale(1.06)';
                  opacity = 1;
                  zIndex = activities.length + 1;
                  boxShadow = '0 0 80px rgba(116,19,220,0.55), 0 60px 120px rgba(0,0,0,0.9)';
                } else if (offset > 0 && offset <= 4) {
                  const angle = stackAngles[stackIdx % stackAngles.length];
                  const xOffset = (stackIdx % 2 === 0 ? -1 : 1) * stackIdx * 14;
                  const yOffset = stackIdx * 10;
                  transform = `rotate(${angle}deg) translate(${xOffset}px, ${yOffset}px) scale(${1 - stackIdx * 0.06})`;
                  opacity = Math.max(0.15, 0.75 - stackIdx * 0.18);
                  zIndex = activities.length - stackIdx;
                  boxShadow = '0 12px 40px rgba(0,0,0,0.5)';
                } else {
                  transform = 'translateY(60px) scale(0.85)';
                  opacity = 0;
                  zIndex = 0;
                  boxShadow = 'none';
                }

                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '360px',
                      height: '480px',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      transform,
                      opacity,
                      zIndex,
                      boxShadow,
                      transition: isActive ? 'none' : 'all 0.7s cubic-bezier(0.34, 1.2, 0.64, 1)',
                      border: isActive ? '1px solid rgba(116,19,220,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      ...animationStyle,
                    }}
                  >
                    {act.image_url ? (
                      <img src={act.image_url} alt={act.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, hsl(${i * 40 + 240},70%,18%), hsl(${i * 40 + 260},60%,10%))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '80px', fontWeight: 800, color: 'rgba(255,255,255,0.07)' }}>{String(i + 1).padStart(2, '0')}</span>
                      </div>
                    )}

                    {/* Gradient overlay on active card */}
                    {isActive && (
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,20,0.85) 0%, transparent 50%)', pointerEvents: 'none' }} />
                    )}

                    {/* Glass title label */}
                    {isActive && (
                      <div key={`label-${activeIdx}`} style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        right: '20px',
                        background: 'rgba(10,10,20,0.55)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '0.5px solid rgba(255,255,255,0.15)',
                        borderRadius: '14px',
                        padding: '12px 18px',
                        animation: 'labelSlideUp 0.6s 0.4s ease both',
                      }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#ffffff' }}>{act.title}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom counter */}
            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              {activities.map((_, i) => (
                <div key={i} style={{
                  width: i === activeIdx ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === activeIdx ? '#a855f7' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.4s ease',
                  boxShadow: i === activeIdx ? '0 0 12px rgba(168,85,247,0.8)' : 'none',
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}