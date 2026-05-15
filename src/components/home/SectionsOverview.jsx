import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';

const SECTIONS = [
  {
    key: 'beavers',
    name: 'Beavers',
    ages: '6–8',
    tagline: 'Where every Scout story begins. Ages 6–8.',
    description: 'Beavers discover the world around them through games, crafts, stories, and outdoor adventures. It\'s where curiosity meets confidence — and friendships that last a lifetime.',
    color: '#006ddf',
    gradient: 'linear-gradient(180deg, rgba(0,109,223,0.5) 0%, rgba(0,109,223,0.85) 100%)',
    btn_color: '#006ddf',
  },
  {
    key: 'cubs',
    name: 'Cubs',
    ages: '8–10½',
    tagline: 'Badges, skills, and real adventure. Ages 8–10½.',
    description: 'Cubs take on bigger challenges — camping trips, community projects, and a badge programme that builds genuine skills. This is where Scouts really starts to bite.',
    color: '#23a950',
    gradient: 'linear-gradient(180deg, rgba(35,169,80,0.5) 0%, rgba(35,169,80,0.85) 100%)',
    btn_color: '#23a950',
  },
  {
    key: 'scouts',
    name: 'Scouts',
    ages: '10½–14',
    tagline: 'Expeditions, leadership, and lasting character. Ages 10½–14.',
    description: 'Scouts take on real expeditions, develop genuine leadership skills, and earn awards that carry weight. This section shapes the people our young people are becoming.',
    color: '#004851',
    gradient: 'linear-gradient(180deg, rgba(0,72,81,0.5) 0%, rgba(0,72,81,0.9) 100%)',
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
      const imgs = await base44.entities.WebsiteImage.filter({ page: 'sections' });
      const map = {};
      imgs.forEach(img => { if (img.label) map[img.label] = img.image_url; });
      setSectionImages(map);
    } catch {}
  };

  return (
    <>
      <style>{`
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
        .section-panel .section-bg { transition: transform 0.5s ease; }
        .section-panel:hover .section-bg { transform: scale(1.05); }
        .section-panel .section-gradient { transition: opacity 0.3s ease; }
        .section-panel:hover .section-gradient { opacity: 1.1; }
        @media (max-width: 767px) {
          .section-panel { flex: none !important; width: 100% !important; height: 240px !important; }
          .section-panel .section-desc { opacity: 1 !important; }
          .section-panel .section-btn { opacity: 1 !important; transform: translateY(0) !important; }
        }
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

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          height: isMobile ? 'auto' : '520px',
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
                style={{ height: isMobile ? '240px' : '100%' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Background image */}
                <div
                  className="section-bg"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                    background: bgImage ? undefined : `linear-gradient(135deg, ${sec.color}aa, ${sec.color}55)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                {/* Gradient overlay */}
                <div className="section-gradient" style={{ position: 'absolute', inset: 0, background: sec.gradient }} />

                {/* Content */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                    Ages {sec.ages}
                  </p>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3vw, 32px)', color: '#fff', margin: 0 }}>
                    {sec.name}
                  </h3>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>
                    {sec.tagline}
                  </p>
                  <p className="section-desc" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.65, margin: '4px 0 0' }}>
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
                        transition: 'transform 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      Find out more →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}