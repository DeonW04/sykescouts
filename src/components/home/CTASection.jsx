import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';

export default function CTASection() {
  const [joinImage, setJoinImage] = useState('');
  const [volunteerImage, setVolunteerImage] = useState('');

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const imgs = await base44.entities.WebsiteImage.filter({ page: 'cta' });
      const joinImg = imgs.find(i => i.label === 'join');
      const volImg = imgs.find(i => i.label === 'volunteer');
      if (joinImg) setJoinImage(joinImg.image_url);
      if (volImg) setVolunteerImage(volImg.image_url);
    } catch {}
  };

  const halfStyle = (image, tint) => ({
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '520px',
    backgroundImage: image ? `url(${image})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: image ? undefined : '#002a6e',
  });

  return (
    <section style={{ display: 'flex', flexWrap: 'wrap' }}>
      {/* Divider */}
      <style>{`
        .cta-half { position: relative; }
        .cta-half::after { content: ''; position: absolute; top: 10%; bottom: 10%; right: 0; width: 1px; background: rgba(255,255,255,0.2); }
        .cta-outline-btn:hover { background: white !important; color: #7413dc !important; }
        .cta-outline-btn { transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease; }
        .cta-outline-btn:hover { transform: scale(1.03); }
        @media (max-width: 767px) { .cta-half::after { display: none; } }
      `}</style>

      {/* JOIN half */}
      <div className="cta-half" style={halfStyle(joinImage, 'rgba(116,19,220,0.72)')}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(116,19,220,0.72)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '56px 48px', maxWidth: '480px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
            For parents
          </p>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>
            No uniform required. No commitment. Just come along.
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, marginBottom: '32px' }}>
            Fill in a quick form and we'll be in touch to find the right section for your child. Come along to a session and see how it feels — no pressure, no obligation.
          </p>
          <Link
            to={createPageUrl('Join')}
            className="cta-outline-btn"
            style={{
              display: 'inline-block',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '15px',
              color: '#fff',
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.8)',
              borderRadius: '30px',
              padding: '12px 28px',
              background: 'transparent',
            }}
          >
            Enquire about joining →
          </Link>
        </div>
      </div>

      {/* VOLUNTEER half */}
      <div style={halfStyle(volunteerImage, 'rgba(0,167,148,0.72)')}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,167,148,0.72)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '56px 48px', maxWidth: '480px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
            For adults
          </p>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 3vw, 32px)', color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>
            You don't need to be Bear Grylls.
          </h2>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.75, marginBottom: '32px' }}>
            We'll train you in everything. Most of our leaders started exactly where you are now. A couple of hours a week, and you'll help shape a young person's life.
          </p>
          <Link
            to={createPageUrl('Volunteer')}
            className="cta-outline-btn"
            style={{
              display: 'inline-block',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '15px',
              color: '#fff',
              textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.8)',
              borderRadius: '30px',
              padding: '12px 28px',
              background: 'transparent',
            }}
          >
            Find out about volunteering →
          </Link>
        </div>
      </div>
    </section>
  );
}