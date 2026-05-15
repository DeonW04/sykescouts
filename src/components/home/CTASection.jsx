import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';

export default function CTASection() {
  const [joinImage, setJoinImage] = useState('');
  const [volunteerImage, setVolunteerImage] = useState('');

  useEffect(() => {
    base44.entities.WebsiteImage.filter({ page: 'cta' }).then(imgs => {
      const joinImg = imgs.find(i => i.label === 'join');
      const volImg = imgs.find(i => i.label === 'volunteer');
      if (joinImg) setJoinImage(joinImg.image_url);
      if (volImg) setVolunteerImage(volImg.image_url);
    }).catch(() => {});
  }, []);

  const halves = [
    {
      image: joinImage,
      tint: 'rgba(116,19,220,0.78)',
      eyebrow: 'For parents',
      heading: 'No uniform required. No commitment. Just come along.',
      body: "Fill in a quick form and we'll be in touch to find the right section for your child. Come along to a session and see how it feels — no pressure, no obligation.",
      btn: 'Enquire about joining →',
      to: createPageUrl('Join'),
    },
    {
      image: volunteerImage,
      tint: 'rgba(0,72,81,0.78)',
      eyebrow: 'For adults',
      heading: 'You don\'t need to be Bear Grylls.',
      body: 'We\'ll train you in everything. Most of our leaders started exactly where you are now. A couple of hours a week, and you\'ll help shape a young person\'s life.',
      btn: 'Find out about volunteering →',
      to: createPageUrl('Volunteer'),
    },
  ];

  return (
    <>
      <style>{`
        .cta-btn:hover { background: white !important; color: #7413dc !important; transform: scale(1.03); }
        .cta-btn { transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease; }
        @media (max-width: 767px) {
          .cta-section { flex-direction: column !important; }
          .cta-half { min-height: 420px !important; }
        }
      `}</style>
      <section className="cta-section" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {halves.map((half, i) => (
          <div
            key={i}
            className="cta-half"
            style={{
              flex: '1 1 320px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '520px',
              backgroundImage: half.image ? `url(${half.image})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: half.image ? undefined : '#1a1a2e',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: half.tint }} />
            <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(40px, 6vw, 64px) clamp(24px, 5vw, 56px)', maxWidth: '480px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
                {half.eyebrow}
              </p>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 'clamp(22px, 3vw, 32px)', color: '#fff', marginBottom: '16px', lineHeight: 1.2 }}>
                {half.heading}
              </h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, marginBottom: '32px' }}>
                {half.body}
              </p>
              <Link
                to={half.to}
                className="cta-btn"
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
                {half.btn}
              </Link>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}