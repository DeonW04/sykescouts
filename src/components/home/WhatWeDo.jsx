import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_ACTIVITIES = [
  { title: 'Rock Climbing', description: 'Scaling real rock faces and indoor walls — pushing limits, building trust.', image_url: '' },
  { title: 'Watersports', description: 'Kayaking, canoeing, and open water adventures on rivers and lakes.', image_url: '' },
  { title: 'Drone Racing', description: 'Building and flying FPV drones. Coding, engineering, and adrenaline.', image_url: '' },
  { title: 'Wild Camping', description: 'Nights under the stars, fire-lighting, foraging, and real outdoor skills.', image_url: '' },
  { title: 'Coding & Robotics', description: 'Programming robots, building circuits, and creating digital projects.', image_url: '' },
  { title: 'Wildlife Handling', description: 'Hands-on encounters with live animals and learning about the natural world.', image_url: '' },
];

export default function WhatWeDo() {
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef(null);
  const scrollAreaRef = useRef(null);

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
        setActivities(configs.map(c => ({
          title: c.label || c.title || 'Activity',
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
      const idx = Math.min(activities.length - 1, Math.floor(clamped * activities.length));
      setActiveIdx(idx);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activities.length, isMobile]);

  const progressPercent = activities.length > 0 ? ((activeIdx + 1) / activities.length) * 100 : 0;

  if (isMobile) {
    // Mobile: tap carousel
    return (
      <section style={{ background: '#f8f7ff', padding: '80px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '12px', textAlign: 'center' }}>
            What we actually do
          </p>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '28px', color: '#1a1a2e', textAlign: 'center', marginBottom: '32px' }}>
            Not what you'd expect.
          </h2>

          {activities[activeIdx]?.image_url && (
            <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', aspectRatio: '4/3' }}>
              <img src={activities[activeIdx].image_url} alt={activities[activeIdx].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '24px', color: '#1a1a2e', marginBottom: '12px' }}>
              {activities[activeIdx]?.title}
            </h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75 }}>
              {activities[activeIdx]?.description}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
              disabled={activeIdx === 0}
              style={{ padding: '10px 24px', borderRadius: '25px', border: '1px solid rgba(26,26,46,0.2)', background: 'transparent', color: activeIdx === 0 ? 'rgba(26,26,46,0.3)' : '#1a1a2e', cursor: activeIdx === 0 ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              ← Prev
            </button>
            <span style={{ color: 'rgba(26,26,46,0.4)', fontFamily: 'DM Sans, sans-serif', alignSelf: 'center', fontSize: '14px' }}>{activeIdx + 1} / {activities.length}</span>
            <button
              onClick={() => setActiveIdx(i => Math.min(activities.length - 1, i + 1))}
              disabled={activeIdx === activities.length - 1}
              style={{ padding: '10px 24px', borderRadius: '25px', border: '1px solid rgba(26,26,46,0.2)', background: 'transparent', color: activeIdx === activities.length - 1 ? 'rgba(26,26,46,0.3)' : '#1a1a2e', cursor: activeIdx === activities.length - 1 ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Next →
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Desktop: sticky scroll
  const sectionScrollHeight = `${activities.length * 100}vh`;

  return (
    <>
      <style>{`
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <section ref={sectionRef} style={{ background: '#f8f7ff', height: sectionScrollHeight, position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex' }}>
          {/* Left sticky column */}
          <div style={{ width: '38%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px 0 max(48px, calc((100vw - 1200px)/2 + 48px))', position: 'relative' }}>
            {/* Progress bar */}
            <div style={{ position: 'absolute', left: 'max(24px, calc((100vw - 1200px)/2 + 24px))', top: '20%', bottom: '20%', width: '3px', background: 'rgba(116,19,220,0.12)', borderRadius: '2px' }}>
              <div style={{ width: '100%', background: '#7413dc', borderRadius: '2px', height: `${progressPercent}%`, transition: 'height 0.4s ease' }} />
            </div>

            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '32px' }}>
              What we actually do
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '40px' }}>
              {activities.map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0', cursor: 'default', transition: 'all 0.3s ease' }}>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500, color: i === activeIdx ? '#7413dc' : 'rgba(26,26,46,0.25)', minWidth: '24px', transition: 'color 0.3s' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: i === activeIdx ? 600 : 400,
                    fontSize: '22px',
                    color: i === activeIdx ? '#1a1a2e' : 'rgba(26,26,46,0.25)',
                    transition: 'all 0.3s ease',
                    flex: 1,
                  }}>
                    {act.title}
                  </span>
                  <span style={{ color: '#7413dc', opacity: i === activeIdx ? 1 : 0, transition: 'opacity 0.3s', fontFamily: 'DM Sans, sans-serif' }}>→</span>
                </div>
              ))}
            </div>

            <div style={{
              background: 'rgba(116,19,220,0.06)',
              border: '1px solid rgba(116,19,220,0.15)',
              borderRadius: '16px',
              padding: '20px 24px',
              minHeight: '80px',
            }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'rgba(26,26,46,0.65)', lineHeight: 1.75, margin: 0, transition: 'opacity 0.3s ease' }}>
                {activities[activeIdx]?.description}
              </p>
            </div>
          </div>

          {/* Right scrollable card stack */}
          <div style={{ width: '62%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', width: '280px', height: '360px' }}>
              {activities.map((act, i) => {
                const offset = i - activeIdx;
                const stackAngles = [-6, -2, 3, -1, 5, -4];
                const isActive = i === activeIdx;
                const isBehind = offset < 0;
                const stackIdx = Math.abs(offset);

                let transform, opacity, zIndex;
                if (isActive) {
                  transform = 'rotate(0deg) translateY(-8px)';
                  opacity = 1;
                  zIndex = activities.length;
                } else if (offset > 0 && offset <= 3) {
                  const angle = stackAngles[stackIdx % stackAngles.length];
                  const xOffset = (stackIdx % 2 === 0 ? -1 : 1) * stackIdx * 8;
                  const yOffset = stackIdx * 6;
                  transform = `rotate(${angle}deg) translate(${xOffset}px, ${yOffset}px)`;
                  opacity = Math.max(0.3, 1 - stackIdx * 0.2);
                  zIndex = activities.length - stackIdx;
                } else {
                  transform = 'rotate(0deg) translateY(20px)';
                  opacity = 0;
                  zIndex = 0;
                }

                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '260px',
                      height: '340px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      overflow: 'hidden',
                      transform,
                      opacity,
                      zIndex,
                      boxShadow: isActive ? '0 30px 80px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.3)',
                      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    {act.image_url ? (
                      <img src={act.image_url} alt={act.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: `hsl(${i * 40 + 240},60%,30%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '48px', fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>{String(i + 1).padStart(2, '0')}</span>
                      </div>
                    )}
                    {/* Glass label */}
                    <div style={{
                      position: 'absolute',
                      bottom: '14px',
                      left: '14px',
                      background: 'rgba(26,26,46,0.65)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '0.5px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      padding: '6px 12px',
                    }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '12px', color: '#fff' }}>{act.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}