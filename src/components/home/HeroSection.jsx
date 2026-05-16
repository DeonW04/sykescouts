import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import { ChevronDown } from 'lucide-react';
import NavBarSpacer from '../public/NavBarSpacer';

export default function HeroSection() {
  const [images, setImages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [fading, setFading] = useState(false);
  const [showChevron, setShowChevron] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    loadConfig();
    const onScroll = () => setShowChevron(window.scrollY < 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadConfig = async () => {
    try {
      const configs = await base44.entities.WebsiteImage.filter({ page: 'hero' });
      if (configs.length > 0) {
        setImages(configs.map(c => c.image_url).filter(Boolean));
      }
    } catch {}
  };

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
    animation: active ? 'kenBurns 6.2s ease forwards' : 'none',
    transition: 'opacity 1.2s ease',
    opacity: active ? 1 : 0,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');

        @keyframes kenBurns {
          from { transform: scale(1.0); }
          to   { transform: scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes chevronPulse {
          0%, 100% { opacity: 0.7; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(6px); }
        }
        .hero-eyebrow { animation: fadeUp 0.65s ease forwards; animation-delay: 0ms; opacity: 0; }
        .hero-h1      { animation: fadeUp 0.65s ease forwards; animation-delay: 120ms; opacity: 0; }
        .hero-body    { animation: fadeUp 0.65s ease forwards; animation-delay: 240ms; opacity: 0; }
        .hero-btns    { animation: fadeUp 0.65s ease forwards; animation-delay: 360ms; opacity: 0; }
        .hero-btn:hover { transform: scale(1.03); }
        .hero-btn { transition: transform 0.2s ease; }
      `}</style>

      <section style={{ position: 'relative', height: 'calc(100dvh + 80px)', minHeight: '600px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-80px', paddingBottom: '0' }}>
        {/* Background images */}
        {images.length > 0 ? (
          <>
            {prevIdx !== null && (
              <div style={{ ...bgStyle(images[prevIdx], false), opacity: fading ? 0 : 1 }} />
            )}
            <div style={bgStyle(images[currentIdx], true)} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)' }} />
        )}

        {/* Dark overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)',
          zIndex: 1,
        }} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 24px', width: '100%', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <NavBarSpacer />
          <div style={{
            background: 'rgba(255,255,255,0.12)',
backdropFilter: 'blur(6px) saturate(150%)',
WebkitBackdropFilter: 'blur(6px) saturate(150%)',
            border: '0.5px solid rgba(255,255,255,0.25)',
            borderRadius: '24px',
            padding: 'clamp(32px, 5vw, 56px)',
          }}>
            <p className="hero-eyebrow" style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#7413dc',
              marginBottom: '18px',
            }}>
              40th Rochdale · Est. 2021
            </p>

            <h1 className="hero-h1" style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(36px, 6vw, 64px)',
              lineHeight: 1.05,
              color: '#fff',
              margin: '0 0 4px',
            }}>
              Built different.
            </h1>
            <h1 className="hero-h1" style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 5vw, 54px)',
              lineHeight: 1.05,
              color: '#7413dc',
              margin: '0 0 24px',
            }}>
              Since 2021.
            </h1>

            <p className="hero-body" style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 400,
              fontSize: '17px',
              lineHeight: 1.75,
              color: 'rgba(255,255,255,0.85)',
              marginBottom: '32px',
              maxWidth: '560px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              We climb, kayak, build, code, camp, and surprise ourselves every single week. This is Scouts — just not as you remember it.
            </p>

            <div className="hero-btns" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to={createPageUrl('Join')}
                className="hero-btn"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  color: '#fff',
                  textDecoration: 'none',
                  background: '#7413dc',
                  borderRadius: '30px',
                  padding: '14px 32px',
                  display: 'inline-block',
                }}
              >
                Join Us →
              </Link>
              <Link
                to={createPageUrl('Volunteer')}
                className="hero-btn"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.9)',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '30px',
                  padding: '14px 32px',
                  display: 'inline-block',
                  background: 'transparent',
                }}
              >
                Volunteer
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll chevron */}
        <div style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          opacity: showChevron ? 1 : 0,
          transition: 'opacity 0.4s ease',
          animation: 'chevronPulse 2s ease-in-out infinite',
        }}>
          <ChevronDown size={32} color="rgba(255,255,255,0.7)" />
        </div>
      </section>
    </>
  );
}