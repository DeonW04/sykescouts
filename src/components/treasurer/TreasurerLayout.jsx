import React from 'react';
import FloatingNav from '../public/FloatingNav';
import NavBarSpacer from '../public/NavBarSpacer';

export default function TreasurerLayout({ children, title }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f7ff 0%, #f0eeff 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
      `}</style>

      <FloatingNav />
      <NavBarSpacer />

      {/* Hero header */}
      {title && (
        <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 16px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Treasurer Portal</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 32px)', color: '#1a1a2e', margin: 0, lineHeight: 1.15 }}>{title}</h1>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px 48px' }}>
        {children}
      </div>
    </div>
  );
}