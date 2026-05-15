import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Menu, X, ChevronDown, Users, Calendar, Award, Mail, Settings, Image, ShieldAlert, CalendarDays, Lightbulb, Package, TrendingUp, FileText, Landmark, BookOpen, ScrollText, LogOut, LayoutDashboard } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const portalGroups = [
  {
    label: 'Members',
    links: [
      { label: 'Members', page: 'LeaderMembers', icon: Users },
      { label: 'Attendance', page: 'LeaderAttendance', icon: Users },
    ],
  },
  {
    label: 'Programme',
    links: [
      { label: 'Meetings', page: 'LeaderProgramme', icon: Calendar },
      { label: 'Events', page: 'LeaderEvents', icon: CalendarDays },
      { label: 'Ideas', page: 'IdeasBoard', icon: Lightbulb },
    ],
  },
  {
    label: 'Safety',
    links: [
      { label: 'Risk Assessments', page: 'RiskAssessments', icon: ShieldAlert },
      { label: 'Consent Forms', page: 'ConsentForms', icon: FileText },
    ],
  },
  {
    label: 'Badges',
    links: [
      { label: 'Tracking', page: 'LeaderBadges', icon: Award },
      { label: 'Award Badges', page: 'AwardBadges', icon: TrendingUp },
      { label: 'Stock', page: 'BadgeStockManagement', icon: Package },
    ],
  },
  {
    label: 'Admin',
    links: [
      { label: 'Comms', page: 'Communications', icon: Mail },
      { label: 'Accounting', page: 'SectionAccounting', icon: Landmark },
      { label: 'Gallery', page: 'LeaderGallery', icon: Image },
    ],
  },
];

export default function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [portalLabel, setPortalLabel] = useState(null);
  const [portalUrl, setPortalUrl] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) return;
      const me = await base44.auth.me();
      setUser(me);
      if (me.role === 'admin') {
        setPortalLabel('Leader Portal');
        setPortalUrl(createPageUrl('LeaderDashboard'));
        setIsLeader(true);
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: me.id });
        if (leaders.length > 0) {
          setPortalLabel('Leader Portal');
          setPortalUrl(createPageUrl('LeaderDashboard'));
          setIsLeader(true);
        } else {
          setPortalLabel('Parent Portal');
          setPortalUrl(createPageUrl('ParentDashboard'));
          setIsLeader(false);
        }
      }
    }).catch(() => {});
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

  const linkStyle = (active) => ({
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 500,
    fontSize: '14px',
    color: active ? '#7413dc' : 'rgba(26,26,46,0.7)',
    textDecoration: 'none',
    padding: '4px 12px',
    borderRadius: '20px',
    background: active ? 'rgba(116,19,220,0.08)' : 'transparent',
    transition: 'color 0.2s, background 0.2s',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          margin: '12px 24px',
          borderRadius: portalOpen ? '24px' : '60px',
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(116,19,220,0.18)',
          boxShadow: scrolled
            ? '0 0 0 1px rgba(116,19,220,0.2), 0 8px 32px rgba(0,0,0,0.1)'
            : '0 2px 16px rgba(0,0,0,0.08)',
          transition: 'background 0.3s ease, box-shadow 0.3s ease, border-radius 0.35s ease',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {/* ── Main row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
              alt="Syke Scouts"
              style={{ height: '48px', width: 'auto' }}
            />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '2px' }}>
            {navLinks.map(link => (
              <Link
                key={link.label}
                to={link.to}
                style={linkStyle(isActive(link.to))}
                onMouseEnter={e => { if (!isActive(link.to)) e.currentTarget.style.color = '#7413dc'; }}
                onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(26,26,46,0.7)'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right CTAs */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {portalLabel ? (
              isLeader ? (
                /* Leader: show expandable portal toggle */
                <button
                  onClick={() => setPortalOpen(!portalOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: portalOpen ? '#7413dc' : 'rgba(116,19,220,0.08)',
                    color: portalOpen ? '#fff' : '#7413dc',
                    border: 'none', borderRadius: '25px',
                    padding: '8px 18px', fontSize: '14px', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  <LayoutDashboard size={15} />
                  Leader Portal
                  <ChevronDown
                    size={14}
                    style={{
                      transform: portalOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                    }}
                  />
                </button>
              ) : (
                /* Parent: just a link */
                <Link
                  to={portalUrl}
                  style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                    color: '#fff', textDecoration: 'none', background: '#7413dc',
                    borderRadius: '25px', padding: '8px 22px',
                    transition: 'background 0.2s',
                  }}
                >
                  {portalLabel} →
                </Link>
              )
            ) : (
              <>
                <Link
                  to={createPageUrl('Volunteer')}
                  style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                    color: 'rgba(26,26,46,0.8)', textDecoration: 'none',
                    border: '0.5px solid rgba(26,26,46,0.25)', borderRadius: '25px',
                    padding: '7px 18px', background: 'transparent', transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,26,46,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Volunteer
                </Link>
                <Link
                  to={createPageUrl('Join')}
                  style={{
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                    color: '#fff', textDecoration: 'none', background: '#7413dc',
                    borderRadius: '25px', padding: '8px 20px',
                    transition: 'background 0.2s',
                  }}
                >
                  Join Us →
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* ── Expandable portal strip (desktop, leaders only) ── */}
        {isLeader && (
          <div style={{
            overflow: 'hidden',
            maxHeight: portalOpen ? '72px' : '0',
            transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
          }}>
            <div style={{
              borderTop: '0.5px solid rgba(116,19,220,0.12)',
              padding: '10px 20px 14px',
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'rgba(116,19,220,0.03)',
              borderRadius: '0 0 24px 24px',
              overflowX: 'auto',
            }}>
              {/* Dashboard link */}
              <Link
                to={createPageUrl('LeaderDashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontWeight: 600, fontSize: '11px', color: '#7413dc',
                  padding: '5px 10px', borderRadius: '20px',
                  background: 'rgba(116,19,220,0.1)', textDecoration: 'none',
                  whiteSpace: 'nowrap', flexShrink: 0, marginRight: '8px',
                }}
              >
                <LayoutDashboard size={12} />
                Dashboard
              </Link>

              {/* Divider */}
              <div style={{ width: '1px', height: '20px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginRight: '4px' }} />

              {/* Portal nav groups */}
              {portalGroups.map((group, gi) => (
                <React.Fragment key={group.label}>
                  {gi > 0 && (
                    <div style={{ width: '1px', height: '20px', background: 'rgba(116,19,220,0.1)', flexShrink: 0, margin: '0 2px' }} />
                  )}
                  {group.links.map(({ label, page, icon: Icon }) => (
                    <Link
                      key={page}
                      to={createPageUrl(page)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontWeight: 500, fontSize: '13px', color: 'rgba(26,26,46,0.65)',
                        padding: '5px 10px', borderRadius: '20px',
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        transition: 'background 0.2s, color 0.2s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.08)'; e.currentTarget.style.color = '#7413dc'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(26,26,46,0.65)'; }}
                    >
                      <Icon size={12} />
                      {label}
                    </Link>
                  ))}
                </React.Fragment>
              ))}

              {/* Sign out */}
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <button
                  onClick={() => base44.auth.logout()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontWeight: 500, fontSize: '13px', color: 'rgba(26,26,46,0.45)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '5px 8px', borderRadius: '20px',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#7413dc'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(26,26,46,0.45)'; }}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile drawer ── */}
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
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px',
                    color: isActive(link.to) ? '#7413dc' : 'rgba(26,26,46,0.75)',
                    textDecoration: 'none', padding: '10px 14px', borderRadius: '12px',
                    background: isActive(link.to) ? 'rgba(116,19,220,0.08)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile portal section */}
              {isLeader && (
                <div style={{ marginTop: '12px', borderTop: '0.5px solid rgba(116,19,220,0.1)', paddingTop: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', padding: '0 4px' }}>
                    Leader Portal
                  </p>
                  <Link
                    to={createPageUrl('LeaderDashboard')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                      color: '#7413dc', textDecoration: 'none',
                      padding: '10px 14px', borderRadius: '12px',
                      background: 'rgba(116,19,220,0.08)',
                    }}
                  >
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  {portalGroups.flatMap(g => g.links).map(({ label, page, icon: Icon }) => (
                    <Link
                      key={page}
                      to={createPageUrl(page)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                        color: 'rgba(26,26,46,0.75)', textDecoration: 'none',
                        padding: '10px 14px', borderRadius: '12px',
                      }}
                    >
                      <Icon size={15} /> {label}
                    </Link>
                  ))}
                  <button
                    onClick={() => base44.auth.logout()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                      color: 'rgba(26,26,46,0.45)', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '10px 14px', borderRadius: '12px', width: '100%',
                      marginTop: '4px',
                    }}
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}

              {!isLeader && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  {portalLabel ? (
                    <Link
                      to={portalUrl}
                      style={{
                        flex: 1, textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500, fontSize: '14px', color: '#fff',
                        textDecoration: 'none', background: '#7413dc',
                        borderRadius: '25px', padding: '10px 18px',
                      }}
                    >
                      {portalLabel} →
                    </Link>
                  ) : (
                    <>
                      <Link
                        to={createPageUrl('Volunteer')}
                        style={{
                          flex: 1, textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 500, fontSize: '14px', color: 'rgba(26,26,46,0.8)',
                          textDecoration: 'none', border: '0.5px solid rgba(26,26,46,0.25)',
                          borderRadius: '25px', padding: '10px 18px', background: 'transparent',
                        }}
                      >
                        Volunteer
                      </Link>
                      <Link
                        to={createPageUrl('Join')}
                        style={{
                          flex: 1, textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 500, fontSize: '14px', color: '#fff',
                          textDecoration: 'none', background: '#7413dc',
                          borderRadius: '25px', padding: '10px 18px',
                        }}
                      >
                        Join Us →
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div style={{ height: '72px' }} />
    </>
  );
}