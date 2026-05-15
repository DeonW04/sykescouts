import React, { useState } from 'react';
import { Calendar, Users, Award, Shield, ChevronRight, Home, BookOpen, Bell, User, Menu, X, ArrowRight, Tent, Zap, Star, Receipt, LayoutGrid, List, LogOut } from 'lucide-react';

const PURPLE = '#7413dc';
const DARK = '#1a1a2e';

// ── Shared mock data ───────────────────────────────────────────────────────────
const mockMeeting = { title: 'Navigation & Pioneering', date: 'Thursday, 21 May', time: '18:30–20:00', section: 'Cubs' };
const mockActions = [{ label: 'Attendance', count: 14, color: '#6366f1' }, { label: 'Consent', count: 3, color: '#14b8a6' }, { label: 'Badges Due', count: 7, color: '#22c55e' }];
const mockNav = [
  { icon: Home, label: 'Dashboard' },
  { icon: Users, label: 'Members' },
  { icon: Calendar, label: 'Programme' },
  { icon: Award, label: 'Badges' },
  { icon: Shield, label: 'Safety' },
];

// ── Concept A: Bottom Tab Bar ──────────────────────────────────────────────────
function ConceptA() {
  const [active, setActive] = useState('Dashboard');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8f7ff', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '18px 20px 14px', borderBottom: '1px solid rgba(116,19,220,0.1)' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: PURPLE, margin: '0 0 2px' }}>Leader Portal</p>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: DARK, margin: 0 }}>Good evening, Sam</h2>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.45)', margin: '2px 0 0' }}>40th Rochdale Scouts</p>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* This week banner */}
        <div style={{ background: 'rgba(116,19,220,0.07)', border: '1px solid rgba(116,19,220,0.13)', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: PURPLE, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>This Week</p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: DARK, margin: '0 0 2px' }}>{mockMeeting.title}</p>
          <p style={{ fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>{mockMeeting.date} · {mockMeeting.time} · {mockMeeting.section}</p>
        </div>
        {/* Action cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {mockActions.map(a => (
            <div key={a.label} style={{ background: '#fff', borderRadius: '12px', padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: a.color, margin: '0 0 2px' }}>{a.count}</p>
              <p style={{ fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>{a.label}</p>
            </div>
          ))}
        </div>
        {/* Quick links */}
        {['Member Details', 'Weekly Programme', 'Badge Tracking', 'Risk Assessments'].map(label => (
          <div key={label} style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '14px', color: DARK, fontWeight: 500 }}>{label}</span>
            <ChevronRight size={16} color="rgba(26,26,46,0.3)" />
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{ background: '#fff', borderTop: '1px solid rgba(116,19,220,0.1)', padding: '8px 0 16px', display: 'flex', justifyContent: 'space-around' }}>
        {mockNav.map(({ icon: Icon, label }) => (
          <button key={label} onClick={() => setActive(label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px' }}>
            <Icon size={20} color={active === label ? PURPLE : 'rgba(26,26,46,0.35)'} />
            <span style={{ fontSize: '10px', color: active === label ? PURPLE : 'rgba(26,26,46,0.35)', fontWeight: active === label ? 600 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Concept B: Card-stack / Swipeable sections ─────────────────────────────────
function ConceptB() {
  const [section, setSection] = useState('Cubs');
  const sections = ['Beavers', 'Cubs', 'Scouts'];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1b69 100%)', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }}>
      {/* Dark header */}
      <div style={{ padding: '24px 20px 20px' }}>
        <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Leader Portal</p>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '24px', color: '#fff', margin: '0 0 16px' }}>Good evening, Sam</h2>
        {/* Section chips */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {sections.map(s => (
            <button key={s} onClick={() => setSection(s)} style={{ padding: '6px 16px', borderRadius: '25px', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, background: section === s ? '#7413dc' : 'rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.2s' }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Content cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Meeting card */}
        <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>This Week · {section}</p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', margin: '0 0 4px' }}>{mockMeeting.title}</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: 0 }}>{mockMeeting.date} · {mockMeeting.time}</p>
          <button style={{ marginTop: '14px', background: PURPLE, color: '#fff', border: 'none', borderRadius: '25px', padding: '8px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>View details →</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {mockActions.map(a => (
            <div key={a.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '24px', color: a.color, margin: '0 0 3px' }}>{a.count}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{a.label}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        {['Member Details', 'Weekly Programme', 'Badge Tracking'].map(label => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{label}</span>
            <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Concept C: Sidebar Drawer (Recommended) ────────────────────────────────────
const drawerGroups = [
  { label: 'Members', icon: Users, links: ['Member Details', 'Attendance', 'Parent Portal'] },
  { label: 'Programme', icon: Calendar, links: ['Weekly Meetings', 'Events', 'Ideas Board'] },
  { label: 'Safety', icon: Shield, links: ['Risk Assessments', 'Consent Forms'] },
  { label: 'Badges', icon: Award, links: ['Badge Tracking', 'Due Badges', 'Badge Stock'] },
];

function ConceptC() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState('Dashboard');
  const [expandedGroup, setExpandedGroup] = useState(null);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden', position: 'relative' }}>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10 }} />
      )}

      {/* Sidebar */}
      <div style={{ position: 'absolute', left: drawerOpen ? 0 : '-270px', top: 0, bottom: 0, width: '270px', background: '#1a1a2e', zIndex: 20, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Leader Portal</p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 2px' }}>Sam Johnson</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>40th Rochdale Scouts</p>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          {/* Dashboard */}
          <button onClick={() => { setActive('Dashboard'); setDrawerOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: active === 'Dashboard' ? PURPLE : 'transparent', border: 'none', cursor: 'pointer', marginBottom: '2px', color: active === 'Dashboard' ? '#fff' : 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500, textAlign: 'left' }}>
            <Home size={15} /> Dashboard
          </button>

          {/* Grouped sections with dropdowns */}
          {drawerGroups.map(group => (
            <div key={group.label}>
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '2px', color: 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <group.icon size={15} /> {group.label}
                </div>
                <ChevronRight size={13} style={{ transform: expandedGroup === group.label ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.3)' }} />
              </button>
              {expandedGroup === group.label && (
                <div style={{ paddingLeft: '14px', marginBottom: '4px' }}>
                  {group.links.map(link => (
                    <button key={link} onClick={() => { setActive(link); setDrawerOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: active === link ? 'rgba(116,19,220,0.3)' : 'transparent', border: 'none', cursor: 'pointer', marginBottom: '1px', color: active === link ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, textAlign: 'left' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                      {link}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back to public site */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500 }}>
            <Home size={14} /> Back to Public Site
          </button>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, marginTop: '2px' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: '#f8f7ff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid rgba(116,19,220,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: DARK }}>
            <Menu size={22} />
          </button>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '17px', color: DARK, margin: 0, flex: 1 }}>{active}</h2>
          <Bell size={18} color="rgba(26,26,46,0.4)" />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          <div style={{ background: 'rgba(116,19,220,0.07)', borderRadius: '14px', padding: '14px 16px', marginBottom: '12px', border: '1px solid rgba(116,19,220,0.12)' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: PURPLE, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 3px' }}>This Week · Cubs</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: DARK, margin: '0 0 2px' }}>{mockMeeting.title}</p>
            <p style={{ fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>{mockMeeting.date} · {mockMeeting.time}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {mockActions.map(a => (
              <div key={a.label} style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: a.color, margin: 0 }}>{a.count}</p>
                <p style={{ fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: 0 }}>{a.label}</p>
              </div>
            ))}
          </div>
          {['Member Details', 'Weekly Programme', 'Badge Tracking', 'Risk Assessments'].map(label => (
            <div key={label} style={{ background: '#fff', borderRadius: '12px', padding: '13px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '14px', color: DARK, fontWeight: 500 }}>{label}</span>
              <ChevronRight size={16} color="rgba(26,26,46,0.3)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Concept D: Card-first / Magazine layout ────────────────────────────────────
function ConceptD() {
  const [active, setActive] = useState('Dashboard');
  const colors = { Members: '#3b82f6', Programme: PURPLE, Badges: '#22c55e', Safety: '#f97316' };
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f2ff', fontFamily: 'DM Sans, sans-serif', overflow: 'hidden' }}>
      {/* Compact header */}
      <div style={{ background: '#fff', padding: '14px 16px', borderBottom: '1px solid rgba(116,19,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: DARK, margin: 0 }}>Hey, Sam 👋</p>
          <p style={{ fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: 0 }}>40th Rochdale Scouts</p>
        </div>
        <div style={{ width: '36px', height: '36px', background: PURPLE, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={17} color="#fff" />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 80px' }}>
        {/* Hero meeting card — full width */}
        <div style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #5c0fb0 100%)`, borderRadius: '20px', padding: '22px', marginBottom: '14px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: '100px', height: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
          <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>This Week's Meeting</p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>{mockMeeting.title}</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 16px' }}>{mockMeeting.date} · {mockMeeting.time}</p>
          <button style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '25px', padding: '7px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>View Programme →</button>
        </div>

        {/* 2x2 feature grid */}
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(26,26,46,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Quick Access</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          {[
            { label: 'Members', sub: '24 active', icon: Users, color: colors.Members },
            { label: 'Programme', sub: '3 upcoming', icon: Calendar, color: colors.Programme },
            { label: 'Badges', sub: '7 to award', icon: Award, color: colors.Badges },
            { label: 'Safety', sub: '2 RAs due', icon: Shield, color: colors.Safety },
          ].map(({ label, sub, icon: Icon, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: '16px', padding: '18px 14px', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}>
              <div style={{ width: '36px', height: '36px', background: `${color}18`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                <Icon size={18} color={color} />
              </div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '15px', color: DARK, margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: '12px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Action summary */}
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(26,26,46,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Pending Actions</p>
        {mockActions.map(a => (
          <div key={a.label} style={{ background: '#fff', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: a.color }} />
              <span style={{ fontSize: '14px', color: DARK, fontWeight: 500 }}>{a.label}</span>
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: a.color }}>{a.count}</span>
          </div>
        ))}
      </div>

      {/* Bottom tab bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid rgba(116,19,220,0.1)', padding: '8px 0 16px', display: 'flex', justifyContent: 'space-around' }}>
        {mockNav.slice(0, 4).map(({ icon: Icon, label }) => (
          <button key={label} onClick={() => setActive(label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px' }}>
            <div style={{ width: active === label ? '32px' : '28px', height: active === label ? '32px' : '28px', background: active === label ? PURPLE : 'transparent', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              <Icon size={17} color={active === label ? '#fff' : 'rgba(26,26,46,0.35)'} />
            </div>
            <span style={{ fontSize: '10px', color: active === label ? PURPLE : 'rgba(26,26,46,0.35)', fontWeight: active === label ? 600 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main demo page ─────────────────────────────────────────────────────────────
const concepts = [
  { id: 'A', label: 'Bottom Tab Bar', desc: 'Classic mobile pattern with persistent bottom navigation. Clean and familiar.', component: ConceptA },
  { id: 'B', label: 'Dark Mode Cards', desc: 'Dark glassmorphism header with light cards. Premium, app-like feel.', component: ConceptB },
  { id: 'C', label: 'Sidebar Drawer', desc: 'Hamburger menu opens a dark sidebar with grouped dropdowns for each section (Members, Programme, Safety, Badges). A "Back to Public Site" button at the bottom keeps navigation clear. Best balance of space and accessibility for leader/parent pages.', component: ConceptC, recommended: true },
  { id: 'D', label: 'Magazine / Card-first', desc: 'Iconic hero card for meeting, 2×2 feature grid below. High visual impact.', component: ConceptD },
];

export default function MobileDashboardDemo() {
  const [selected, setSelected] = useState('A');
  const active = concepts.find(c => c.id === selected);
  const ActiveComponent = active.component;

  return (
    <div style={{ minHeight: '100vh', background: '#f0eeff', fontFamily: 'DM Sans, sans-serif', padding: '40px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: PURPLE, margin: '0 0 6px' }}>Design exploration</p>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '36px', color: DARK, margin: '0 0 6px' }}>Mobile Dashboard Concepts</h1>
        <p style={{ fontSize: '15px', color: 'rgba(26,26,46,0.55)', margin: '0 0 36px' }}>Click each concept to preview it in a phone mockup. Let us know which direction you prefer!</p>

        {/* Concept selector tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {concepts.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500,
              background: selected === c.id ? PURPLE : '#fff',
              color: selected === c.id ? '#fff' : 'rgba(26,26,46,0.7)',
              boxShadow: selected === c.id ? `0 4px 16px ${PURPLE}40` : '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s',
              position: 'relative',
            }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px' }}>{c.id}</span>
              {c.label}
              {c.recommended && (
                <span style={{ fontSize: '10px', fontWeight: 700, background: '#22c55e', color: '#fff', padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.04em' }}>✓ Recommended</span>
              )}
            </button>
          ))}
        </div>

        {/* Preview area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>
          {/* Info panel */}
          <div>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', background: `${PURPLE}15`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px', color: PURPLE }}>{active.id}</span>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '22px', color: DARK, margin: '0 0 8px' }}>{active.label}</h2>
              <p style={{ fontSize: '14px', color: 'rgba(26,26,46,0.55)', lineHeight: 1.6, margin: 0 }}>{active.desc}</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: DARK, margin: '0 0 14px' }}>All concepts include</p>
              {['Section chip selector', 'This week\'s meeting banner', 'Action summary stats', 'Quick navigation links'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PURPLE, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'rgba(26,26,46,0.65)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '375px', height: '680px',
              background: '#fff', borderRadius: '44px',
              boxShadow: '0 0 0 12px #1a1a2e, 0 0 0 14px #333, 0 24px 60px rgba(0,0,0,0.35)',
              overflow: 'hidden', position: 'relative',
              flexShrink: 0,
            }}>
              {/* Status bar */}
              <div style={{ height: '44px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, position: 'relative', zIndex: 5 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: DARK }}>9:41</span>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '120px', height: '28px', background: '#000', borderRadius: '0 0 18px 18px' }} />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <div style={{ width: '14px', height: '10px', border: '1.5px solid rgba(26,26,46,0.5)', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '5px', background: 'rgba(26,26,46,0.5)', borderRadius: '1px' }} />
                    <div style={{ width: '75%', height: '100%', background: '#22c55e', borderRadius: '1px' }} />
                  </div>
                </div>
              </div>
              {/* App content */}
              <div style={{ position: 'absolute', top: '44px', left: 0, right: 0, bottom: 0 }}>
                <ActiveComponent />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}