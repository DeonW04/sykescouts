import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';

const SECTIONS = [
  {
    key: 'beavers',
    name: 'Beavers',
    ages: '6–8',
    tagline: 'Where every Scout story begins.',
    description: 'Beavers discover the world around them through games, crafts, stories, and outdoor adventures. It\'s where curiosity meets confidence — and friendships that last a lifetime.',
    color: '#006ddf',
    tint: 'rgba(0,109,223,0.82)',
    gradient: 'linear-gradient(180deg, rgba(0,109,223,0.45) 0%, rgba(0,109,223,0.88) 100%)',
    btn_color: '#006ddf',
  },
  {
    key: 'cubs',
    name: 'Cubs',
    ages: '8–10½',
    tagline: 'Badges, skills, and real adventure.',
    description: 'Cubs take on bigger challenges — camping trips, community projects, and a badge programme that builds genuine skills. This is where Scouts really starts to bite.',
    color: '#23a950',
    tint: 'rgba(35,169,80,0.82)',
    gradient: 'linear-gradient(180deg, rgba(35,169,80,0.45) 0%, rgba(35,169,80,0.88) 100%)',
    btn_color: '#23a950',
  },
  {
    key: 'scouts',
    name: 'Scouts',
    ages: '10½–14',
    tagline: 'Expeditions, leadership, and lasting character.',
    description: 'Scouts take on real expeditions, develop genuine leadership skills, and earn awards that carry weight. This section shapes the people our young people are becoming.',
    color: '#004851',
    tint: 'rgba(0,72,81,0.82)',
    gradient: 'linear-gradient(180deg, rgba(0,72,81,0.45) 0%, rgba(0,72,81,0.92) 100%)',
    btn_color: '#00a794',
  },
];

export default function SectionsOverview() {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [sectionImages, setSectionImages] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    loadImages();
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadImages = async () => {
    try {
      const [byLabel, byPage] = await Promise.all([
        base44.entities.WebsiteImage.filter({ page: 'sections' }),
        Promise.all(['beavers', 'cubs', 'scouts'].map(s =>
          base44.entities.WebsiteImage.filter({ page: s }).then(r => r[0]).catch(() => null)
        )),
      ]);
      const map = {};
      byLabel.forEach(img => { if (img.label) map[img.label] = img.image_url; });
      ['beavers', 'cubs', 'scouts'].forEach((s, i) => { if (!map[s] && byPage[i]?.image_url) map[s] = byPage[i].image_url; });
      setSectionImages(map);
    } catch {}
  };

  return (
    <>
      <style>{`
        /* ── Desktop accordion panels ── */
        .section-panel {
          flex: 1;
          position: relative;
          overflow: hidden;
          cursor: default;
          transition: flex 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .section-panel:hover { flex: 2.5; }
        .section-panel .section-desc { opacity: 0; transition: opacity 0.3s ease 0.15s; }
        .section-panel:hover .section-desc { opacity: 1; }
        .section-panel .section-btn { opacity: 0; transform: translateY(12px); transition: opacity 0.3s ease 0.2s, transform 0.3s ease 0.2s; }
        .section-panel:hover .section-btn { opacity: 1; transform: translateY(0); }
        .section-panel .section-bg-img { opacity: 0; transition: opacity 0.5s ease 0.1s, transform 0.6s ease; }
        .section-panel:hover .section-bg-img { opacity: 1; }
        .section-panel .section-bg-img { transition: transform 0.6s ease, opacity 0.5s ease 0.1s; }
        .section-panel:hover .section-bg-img { transform: scale(1.05); }
      `}</style>

      <section style={{ background: '#ffffff', padding: '80px 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px', textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(28px, 4vw, 44px)', color: '#1a1a2e', margin: '0 0 12px' }}>
            Find your section.
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '17px', color: 'rgba(26,26,46,0.55)', lineHeight: 1.75 }}>
            Every child starts somewhere. Here's where yours belongs.
          </p>
        </div>

        {/* ── DESKTOP: accordion panels ── */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            height: '520px',
            gap: '4px',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 32px',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            {SECTIONS.map((sec, i) => {
              const bgImage = sectionImages[sec.key];
              return (
                <div
                  key={sec.key}
                  className="section-panel"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Solid colour base */}
                  <div style={{ position: 'absolute', inset: 0, background: sec.color }} />

                  {/* Background photo — fades in on hover */}
                  {bgImage && (
                    <div
                      className="section-bg-img"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${bgImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  )}

                  {/* Colour tint — always present to keep text readable */}
                  <div style={{ position: 'absolute', inset: 0, background: sec.gradient }} />

                  {/* Content */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                      Ages {sec.ages}
                    </p>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3vw, 32px)', color: '#fff', margin: 0 }}>
                      {sec.name}
                    </h3>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                      {sec.tagline}
                    </p>
                    <p className="section-desc" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: '4px 0 0' }}>
                      {sec.description}
                    </p>
                    <div className="section-btn" style={{ marginTop: '12px' }}>
                      <Link
                        to={createPageUrl('Join')}
                        style={{
                          display: 'inline-block',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 500,
                          fontSize: '14px',
                          color: '#fff',
                          textDecoration: 'none',
                          background: sec.btn_color,
                          borderRadius: '25px',
                          padding: '10px 22px',
                        }}
                      >
                        Find out more →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MOBILE: stacked cards ── */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 20px' }}>
            {SECTIONS.map((sec) => {
              const bgImage = sectionImages[sec.key];
              return (
                <div
                  key={sec.key}
                  style={{ borderRadius: '20px', overflow: 'hidden', position: 'relative' }}
                >
                  {/* Image or solid colour background */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: bgImage ? undefined : sec.color,
                  }} />
                  {/* Tint overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: sec.tint }} />

                  {/* Content */}
                  <div style={{ position: 'relative', zIndex: 1, padding: '28px 24px 24px' }}>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: '0 0 6px' }}>
                      Ages {sec.ages}
                    </p>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '28px', color: '#fff', margin: '0 0 8px' }}>
                      {sec.name}
                    </h3>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, margin: '0 0 20px' }}>
                      {sec.description}
                    </p>
                    <Link
                      to={createPageUrl('Join')}
                      style={{
                        display: 'inline-block',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500,
                        fontSize: '14px',
                        color: '#fff',
                        textDecoration: 'none',
                        border: '2px solid rgba(255,255,255,0.7)',
                        borderRadius: '25px',
                        padding: '10px 22px',
                        background: 'transparent',
                      }}
                    >
                      Find out more →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}