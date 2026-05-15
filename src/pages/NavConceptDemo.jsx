import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  Home, Users, Calendar, Star, BookOpen, Camera, ChevronRight,
  ArrowLeftRight, LayoutDashboard, X, Menu, ChevronDown, LogOut
} from 'lucide-react';

// ─── Shared style constants ───────────────────────────────────────────────────
const NAV_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  margin: '12px 24px',
  borderRadius: '60px',
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '0.5px solid rgba(116,19,220,0.18)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
  fontFamily: 'DM Sans, sans-serif',
};

const publicLinks = ['Home', 'About', 'Gallery', 'Join', 'Volunteer', 'Contact'];
const leaderLinks = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Members', icon: Users },
  { label: 'Programme', icon: Calendar },
  { label: 'Badges', icon: Star },
  { label: 'Events', icon: BookOpen },
  { label: 'Gallery', icon: Camera },
];

// ─── CONCEPT A: Expandable / Extend Nav ──────────────────────────────────────
function ConceptA() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('public');

  return (
    <div style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #ede9ff 100%)', minHeight: '320px', padding: '0 0 40px', position: 'relative' }}>
      {/* The Nav */}
      <nav style={{ ...NAV_STYLE, borderRadius: expanded ? '24px' : '60px' }}>
        {/* Main Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
              alt="Syke Scouts" style={{ height: '44px', width: 'auto' }}
            />
          </div>

          {/* Public nav links — always visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {publicLinks.map(l => (
              <span key={l} style={{
                fontWeight: 500, fontSize: '14px', color: 'rgba(26,26,46,0.65)',
                padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
                transition: 'color 0.2s, background 0.2s',
              }}>{l}</span>
            ))}
          </div>

          {/* Expand / collapse portal strip */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: expanded ? '#7413dc' : 'rgba(116,19,220,0.08)',
              color: expanded ? '#fff' : '#7413dc',
              border: 'none', borderRadius: '25px',
              padding: '8px 18px', fontSize: '14px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.25s ease',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <LayoutDashboard size={15} />
            Leader Portal
            <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
          </button>
        </div>

        {/* Expandable Portal Strip */}
        <div style={{
          overflow: 'hidden',
          maxHeight: expanded ? '80px' : '0',
          transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}>
          <div style={{
            borderTop: '0.5px solid rgba(116,19,220,0.12)',
            padding: '10px 20px 14px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(116,19,220,0.03)',
            borderRadius: '0 0 24px 24px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: '8px' }}>
              Leader Portal
            </span>
            {leaderLinks.map(({ label, icon: Icon }) => (
              <span key={label} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontWeight: 500, fontSize: '13px', color: 'rgba(26,26,46,0.7)',
                padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                background: 'transparent', transition: 'background 0.2s, color 0.2s',
              }}>
                <Icon size={13} />
                {label}
              </span>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px', fontWeight: 500, color: '#7413dc',
                background: 'rgba(116,19,220,0.08)', borderRadius: '20px',
                padding: '4px 12px',
              }}>
                Ben (Leader)
              </span>
              <LogOut size={15} style={{ color: 'rgba(26,26,46,0.4)', cursor: 'pointer' }} />
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div style={{ height: expanded ? 120 : 72 }} />

      {/* Demo content */}
      <div style={{ padding: '20px 40px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid rgba(116,19,220,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', color: '#1a1a2e', margin: '0 0 10px' }}>
            💡 Concept A — Expandable Portal Strip
          </h3>
          <p style={{ color: 'rgba(26,26,46,0.6)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            The public nav stays fixed at the top. Clicking <strong>"Leader Portal"</strong> slides open a second row beneath it showing portal navigation. One nav, two rows — no context lost.
            Great if you want the public site always visible and portal access feels like a "mode" you drop into.
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: '16px', background: '#7413dc', color: '#fff', border: 'none',
              borderRadius: '25px', padding: '10px 24px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
            }}
          >
            {expanded ? 'Collapse portal strip ↑' : 'Try it — expand portal strip ↓'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONCEPT B: Swap / Toggle Nav ────────────────────────────────────────────
function ConceptB() {
  const [mode, setMode] = useState('public'); // 'public' | 'portal'
  const isPortal = mode === 'portal';

  return (
    <div style={{ background: isPortal ? 'linear-gradient(135deg, #1a1a2e 0%, #2d1a5e 100%)' : 'linear-gradient(135deg, #f8f7ff 0%, #ede9ff 100%)', minHeight: '320px', padding: '0 0 40px', position: 'relative', transition: 'background 0.5s ease' }}>
      {/* The Nav */}
      <nav style={{
        ...NAV_STYLE,
        background: isPortal ? 'rgba(26,26,46,0.9)' : 'rgba(255,255,255,0.92)',
        border: isPortal ? '0.5px solid rgba(255,255,255,0.1)' : '0.5px solid rgba(116,19,220,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          {/* Logo */}
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
            alt="Syke Scouts" style={{ height: '44px', width: 'auto' }}
          />

          {/* Links — animate between sets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', transition: 'all 0.3s ease' }}>
            {isPortal
              ? leaderLinks.map(({ label, icon: Icon }) => (
                  <span key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontWeight: 500, fontSize: '13px', color: 'rgba(255,255,255,0.75)',
                    padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                    transition: 'color 0.2s, background 0.2s',
                  }}>
                    <Icon size={13} />
                    {label}
                  </span>
                ))
              : publicLinks.map(l => (
                  <span key={l} style={{
                    fontWeight: 500, fontSize: '14px', color: 'rgba(26,26,46,0.65)',
                    padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
                  }}>{l}</span>
                ))
            }
          </div>

          {/* Toggle button */}
          <button
            onClick={() => setMode(isPortal ? 'public' : 'portal')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: isPortal ? 'rgba(255,255,255,0.12)' : 'rgba(116,19,220,0.08)',
              color: isPortal ? '#fff' : '#7413dc',
              border: isPortal ? '0.5px solid rgba(255,255,255,0.2)' : 'none',
              borderRadius: '25px', padding: '8px 18px', fontSize: '14px',
              fontWeight: 500, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.3s ease',
            }}
          >
            <ArrowLeftRight size={14} />
            {isPortal ? 'Back to Site' : 'Leader Portal'}
          </button>
        </div>
      </nav>

      {/* Spacer */}
      <div style={{ height: '72px' }} />

      {/* Demo content */}
      <div style={{ padding: '20px 40px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: isPortal ? 'rgba(255,255,255,0.07)' : 'white',
          border: isPortal ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(116,19,220,0.1)',
          borderRadius: '20px', padding: '28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          transition: 'all 0.4s ease',
        }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', color: isPortal ? '#fff' : '#1a1a2e', margin: '0 0 10px' }}>
            💡 Concept B — Swap / Toggle Nav
          </h3>
          <p style={{ color: isPortal ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,46,0.6)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
            One nav, two "modes". Clicking the toggle swaps the entire nav content — public links become portal links, the colour scheme shifts. Feels like switching context cleanly.
            Best when portal and public site are genuinely separate worlds.
          </p>
          <button
            onClick={() => setMode(isPortal ? 'public' : 'portal')}
            style={{
              marginTop: '16px',
              background: isPortal ? 'rgba(255,255,255,0.15)' : '#7413dc',
              color: '#fff', border: 'none',
              borderRadius: '25px', padding: '10px 24px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              transition: 'background 0.3s',
            }}
          >
            {isPortal ? '← Switch to public site nav' : 'Switch to portal nav →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Demo Page ────────────────────────────────────────────────────────────────
export default function NavConceptDemo() {
  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');`}</style>

      {/* Page header */}
      <div style={{ background: '#1a1a2e', padding: '48px 40px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '10px' }}>
          Nav concept demo
        </p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '36px', color: '#fff', margin: '0 0 12px' }}>
          Two ideas for a unified nav
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.7 }}>
          Both use the same pill-shaped floating nav you already have. Click the buttons inside each demo to try them out.
        </p>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>
          ← Back to site
        </Link>
      </div>

      {/* Divider */}
      <div style={{ background: '#7413dc', padding: '10px 40px', textAlign: 'center' }}>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em' }}>CONCEPT A — EXPANDABLE PORTAL STRIP</span>
      </div>

      <ConceptA />

      <div style={{ background: '#5c0fb0', padding: '10px 40px', textAlign: 'center' }}>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em' }}>CONCEPT B — SWAP / TOGGLE NAV</span>
      </div>

      <ConceptB />

      {/* Summary */}
      <div style={{ background: '#f8f7ff', borderTop: '1px solid rgba(116,19,220,0.1)', padding: '48px 40px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: '#1a1a2e', margin: '0 0 20px' }}>Which feels right?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '680px', margin: '0 auto', textAlign: 'left' }}>
          {[
            {
              label: 'Concept A — Expandable',
              pros: ['Public site always accessible', 'Portal feels like a "mode"', 'Good for leaders who browse both'],
              cons: ['Nav gets tall when open', 'Slightly more complex mentally'],
            },
            {
              label: 'Concept B — Toggle',
              pros: ['Cleanest single-row nav', 'Clear separation of contexts', 'Easy to understand at a glance'],
              cons: ['Loses public links when in portal', 'Needs a clear "back to site" button'],
            },
          ].map(({ label, pros, cons }) => (
            <div key={label} style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid rgba(116,19,220,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: '#1a1a2e', margin: '0 0 12px' }}>{label}</h3>
              <div style={{ marginBottom: '10px' }}>
                {pros.map(p => <p key={p} style={{ margin: '4px 0', fontSize: '13px', color: '#2d8a5e' }}>✓ {p}</p>)}
              </div>
              <div>
                {cons.map(c => <p key={c} style={{ margin: '4px 0', fontSize: '13px', color: '#c0392b' }}>✗ {c}</p>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}