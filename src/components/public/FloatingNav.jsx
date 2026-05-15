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
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(116,19,220,0.15)',
          boxShadow: scrolled ? '0 0 0 1px rgba(116,19,220,0.2), 0 8px 32px rgba(0,0,0,0.1)' : '0 2px 16px rgba(0,0,0,0.08)',
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
              <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500, fontSize: '15px', color: '#1a1a2e' }}>Syke Scouts</div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: '11px', color: '#7413dc' }}>40th Rochdale</div>
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
                  color: isActive(link.to) ? '#7413dc' : 'rgba(26,26,46,0.7)',
                  textDecoration: 'none',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  background: isActive(link.to) ? 'rgba(116,19,220,0.08)' : 'transparent',
                  transition: 'color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#7413dc'; }}
                onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(26,26,46,0.7)'; }}
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
                color: 'rgba(26,26,46,0.8)',
                textDecoration: 'none',
                border: '0.5px solid rgba(26,26,46,0.25)',
                borderRadius: '25px',
                padding: '7px 18px',
                background: 'transparent',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,26,46,0.06)'; }}
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
            style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {menuOpen && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '0.5px solid rgba(116,19,220,0.1)',
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
                    color: isActive(link.to) ? '#7413dc' : 'rgba(26,26,46,0.75)',
                    textDecoration: 'none',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isActive(link.to) ? 'rgba(116,19,220,0.08)' : 'transparent',
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
                    color: 'rgba(26,26,46,0.8)',
                    textDecoration: 'none',
                    border: '0.5px solid rgba(26,26,46,0.25)',
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