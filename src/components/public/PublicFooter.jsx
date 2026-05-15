import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function PublicFooter() {
  return (
    <footer style={{
      background: '#002a6e',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '60px 0 30px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', marginBottom: '48px' }}>
          {/* Col 1 */}
          <div>
            <Link to="/">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
                alt="Syke Scouts"
                style={{ height: '48px', width: 'auto', marginBottom: '16px' }}
              />
            </Link>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
              Inspiring adventure in Syke since 2021.
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '8px' }}>
              A registered Scout Group — 40th Rochdale.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Explore
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Home', to: '/' },
                { label: 'About', to: createPageUrl('About') },
                { label: 'Gallery', to: createPageUrl('Gallery') },
                { label: 'Contact', to: createPageUrl('Contact') },
              ].map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
              Get Involved
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Join Scouts', to: createPageUrl('Join') },
                { label: 'Volunteer', to: createPageUrl('Volunteer') },
                { label: 'Parent Portal', to: createPageUrl('ParentDashboard') },
              ].map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            © {new Date().getFullYear()} Syke Scout Group. Registered charity. Part of The Scout Association, registered charity 306101 (England &amp; Wales).
          </p>
        </div>
      </div>
    </footer>
  );
}