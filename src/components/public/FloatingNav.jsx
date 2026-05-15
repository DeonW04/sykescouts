import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Menu, X } from 'lucide-react';

export default function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', to: createPageUrl('About') },
    { label: 'Gallery', to: createPageUrl('Gallery') },
    { label: 'Join', to: createPageUrl('Join') },
    { label: 'Volunteer', to: createPageUrl('Volunteer') },
    { label: 'Contact', to: createPageUrl('Contact') },
  ];

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          margin: '12px 24px',
          borderRadius: '60px',
          background: scrolled ? 'rgba(0,57,130,0.88)' : 'rgba(0,57,130,0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(255,255,255,0.2)',
          boxShadow: scrolled ? '0 0 0 1px rgba(116,19,220,0.35), 0 8px 32px rgba(0,0,0,0.3)' : 'none',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
              alt="Syke Scouts"
              style={{ height: '38px', width: 'auto' }}
            />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500, fontSize: '15px', color: '#fff' }}>Syke Scouts</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '11px', color: '#00a794' }}>40th Rochdale</div>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '4px' }}>
            {navLinks.map(link => (
              <Link
                key={link.label}
                to={link.to}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: isActive(link.to) ? '#fff' : 'rgba(255,255,255,0.75)',
                  textDecoration: 'none',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  background: isActive(link.to) ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '10px' }}>
            <Link
              to={createPageUrl('Volunteer')}
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                color: 'rgba(255,255,255,0.9)',
                textDecoration: 'none',
                border: '0.5px solid rgba(255,255,255,0.35)',
                borderRadius: '25px',
                padding: '7px 18px',
                background: 'transparent',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Volunteer
            </Link>
            <Link
              to={createPageUrl('Join')}
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                fontSize: '14px',
                color: '#fff',
                textDecoration: 'none',
                background: '#7413dc',
                borderRadius: '25px',
                padding: '8px 20px',
                border: 'none',
                transition: 'transform 0.2s ease, background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#5c0fb0'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#7413dc'; }}
            >
              Join Us →
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div style={{
            background: 'rgba(0,57,130,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: '0 0 30px 30px',
            padding: '16px 20px 20px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    fontSize: '16px',
                    color: isActive(link.to) ? '#fff' : 'rgba(255,255,255,0.75)',
                    textDecoration: 'none',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isActive(link.to) ? 'rgba(255,255,255,0.12)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <Link
                  to={createPageUrl('Volunteer')}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.9)',
                    textDecoration: 'none',
                    border: '0.5px solid rgba(255,255,255,0.35)',
                    borderRadius: '25px',
                    padding: '10px 18px',
                    background: 'transparent',
                  }}
                >
                  Volunteer
                </Link>
                <Link
                  to={createPageUrl('Join')}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#fff',
                    textDecoration: 'none',
                    background: '#7413dc',
                    borderRadius: '25px',
                    padding: '10px 18px',
                  }}
                >
                  Join Us →
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      {/* Spacer so content isn't hidden behind fixed nav */}
      <div style={{ height: '72px' }} />
    </>
  );
}