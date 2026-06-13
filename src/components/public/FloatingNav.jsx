import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  Menu, X, ChevronDown, ChevronRight, Users, Calendar, Award, Mail, Settings,
  Image, ShieldAlert, CalendarDays, Lightbulb, Package, TrendingUp,
  FileText, Landmark, BookOpen, LogOut, LayoutDashboard, UserCheck, Home, UserCircle, MessageSquare,
  Baby,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PORTAL_NAV_GROUPS } from '@/lib/navConfig';
import LoginDropdown from './LoginDropdown';

// Portal nav groups — single source of truth in lib/navConfig
const portalGroups = PORTAL_NAV_GROUPS;

// Parent portal nav links (flat — no dropdowns)
const parentNavLinks = [
  { label: 'My Child', page: 'MyChild', icon: Baby },
  { label: 'Programme', page: 'ParentProgramme', icon: Calendar },
  { label: 'Events', page: 'ParentEvents', icon: CalendarDays },
  { label: 'Badges', page: 'ParentBadges', icon: Award },
];

const STRIP_RADIUS = '24px';

// Portal page paths — any /leader, /parent, /treasurer, /admin or /account route
// counts as a portal page (drives the expandable portal strip).
const PORTAL_PREFIXES = ['/leader', '/parent', '/treasurer', '/admin', '/account'];

// ── Mobile Sidebar Drawer ──────────────────────────────────────────────────────
function MobileSidebar({ open, onClose, isLeader, isAdmin, isParent, user, portalLabel, portalUrl, isPortalPage, onLogin }) {
  const location = useLocation();
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [showPortal, setShowPortal] = useState(isPortalPage);

  useEffect(() => {
    setShowPortal(isPortalPage);
    setExpandedGroup(null);
  }, [isPortalPage, open]);

  const hasPortal = !!(portalLabel && (isLeader || isParent || user));

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', to: createPageUrl('About') },
    { label: 'Gallery', to: createPageUrl('Gallery') },
    { label: 'Join', to: createPageUrl('Join') },
    { label: 'Volunteer', to: createPageUrl('Volunteer') },
    { label: 'Contact', to: createPageUrl('Contact') },
  ];

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const linkStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
    textDecoration: 'none', padding: '10px 12px', borderRadius: '10px',
    background: active ? 'rgba(116,19,220,0.4)' : 'transparent',
    marginBottom: '2px',
  });

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, backdropFilter: 'blur(2px)' }}
        />
      )}

      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
        background: '#1a1a2e', zIndex: 1060,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'hidden',
      }}>
        {/* Drawer header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {showPortal && hasPortal && (
              <button
                onClick={() => { setShowPortal(false); setExpandedGroup(null); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>
                {showPortal ? (portalLabel || 'Portal') : '40th Rochdale Scouts'}
              </p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
                {showPortal ? (() => { const n = user?.full_name?.split(' ')[0] || 'Menu'; return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(); })() : 'Menu'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav content */}
        <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {!showPortal ? (
            /* ── PUBLIC VIEW ── */
            <>
              {navLinks.map(link => (
                <Link key={link.label} to={link.to} onClick={onClose} style={linkStyle(isActive(link.to))}>
                  {link.label}
                </Link>
              ))}

              <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                {user && hasPortal ? (
                  <button
                    onClick={() => { setShowPortal(true); setExpandedGroup(null); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                      color: '#fff', background: 'rgba(116,19,220,0.35)', border: 'none',
                      cursor: 'pointer', padding: '11px 14px', borderRadius: '12px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LayoutDashboard size={15} /> {portalLabel}
                    </span>
                    <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                ) : !user ? (
                  <button
                    onClick={() => { onClose(); onLogin(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                      color: '#fff', background: '#7413dc', border: 'none', cursor: 'pointer',
                      padding: '10px 12px', borderRadius: '10px',
                    }}
                  >
                    Sign In
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            /* ── PORTAL VIEW ── */
            <>
              {isLeader ? (
                <>
                  <Link to={createPageUrl('LeaderDashboard')} onClick={onClose} style={linkStyle(location.pathname === createPageUrl('LeaderDashboard'))}>
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>

                  {portalGroups.map(group => {
                    const isGroupActive = group.links.some(({ page }) => location.pathname === createPageUrl(page) || location.pathname.startsWith(createPageUrl(page) + '/'));
                    return (
                      <div key={group.label}>
                        <button
                          onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '10px', background: isGroupActive ? 'rgba(116,19,220,0.2)' : 'transparent', border: 'none',
                            cursor: 'pointer', marginBottom: '2px',
                            color: isGroupActive ? '#fff' : 'rgba(255,255,255,0.65)',
                            fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: isGroupActive ? 600 : 500,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <group.icon size={15} /> {group.label}
                          </div>
                          <ChevronRight size={13} style={{ transform: expandedGroup === group.label ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.3)' }} />
                        </button>
                        {expandedGroup === group.label && (
                          <div style={{ paddingLeft: '12px', marginBottom: '4px' }}>
                            {group.links.map(({ label, page, icon: Icon, adminOnly }) => {
                              if (adminOnly && !isAdmin) return null;
                              const active = location.pathname === createPageUrl(page) || location.pathname.startsWith(createPageUrl(page) + '/');
                              return (
                                <Link key={page} to={createPageUrl(page)} onClick={onClose} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500,
                                  color: active ? '#fff' : 'rgba(255,255,255,0.55)', textDecoration: 'none',
                                  padding: '8px 12px', borderRadius: '8px', marginBottom: '1px',
                                  background: active ? 'rgba(116,19,220,0.3)' : 'transparent',
                                }}>
                                  <Icon size={13} style={{ flexShrink: 0 }} /> {label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isAdmin && (
                    <Link to={createPageUrl('AdminSettings')} onClick={onClose} style={linkStyle(location.pathname === createPageUrl('AdminSettings'))}>
                      <Settings size={15} /> Admin Area
                    </Link>
                  )}
                </>
              ) : isParent ? (
                /* ── PARENT PORTAL MOBILE ── */
                <>
                  <Link to={createPageUrl('ParentDashboard')} onClick={onClose} style={linkStyle(location.pathname === createPageUrl('ParentDashboard'))}>
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                  {parentNavLinks.map(({ label, page, icon: Icon }) => {
                    const active = location.pathname === createPageUrl(page) || location.pathname.startsWith(createPageUrl(page) + '/');
                    return (
                      <Link key={page} to={createPageUrl(page)} onClick={onClose} style={linkStyle(active)}>
                        <Icon size={15} /> {label}
                      </Link>
                    );
                  })}
                </>
              ) : (
                <Link to={portalUrl} onClick={onClose} style={linkStyle(true)}>
                  <LayoutDashboard size={15} /> {portalLabel}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {user && (
          <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button onClick={() => base44.auth.logout()} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500,
              color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '10px 12px', borderRadius: '10px',
            }}><LogOut size={14} /> Sign out</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main FloatingNav ───────────────────────────────────────────────────────────
export default function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [portalLabel, setPortalLabel] = useState(null);
  const [portalUrl, setPortalUrl] = useState(null);
  const [portalOpen, setPortalOpen] = useState(false);
  const [joinOpen,   setJoinOpen]   = useState(false);
  const [loginOpen,  setLoginOpen]  = useState(false);
  const location = useLocation();

  const isPortalPage = PORTAL_PREFIXES.some(p => location.pathname.startsWith(p));

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
        setIsLeader(true);
        setIsAdmin(true);
        setPortalLabel('Leader Portal');
        setPortalUrl(createPageUrl('LeaderDashboard'));
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: me.id });
        if (leaders.length > 0) {
          setIsLeader(true);
          setPortalLabel('Leader Portal');
          setPortalUrl(createPageUrl('LeaderDashboard'));
        } else {
          setIsParent(true);
          setPortalLabel('Parent Portal');
          setPortalUrl(createPageUrl('ParentDashboard'));
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setMobileDrawerOpen(false);
    setPortalOpen(isPortalPage);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', to: createPageUrl('About') },
    { label: 'Gallery', to: createPageUrl('Gallery') },
    { label: 'Join', to: createPageUrl('Join') },
    { label: 'Volunteer', to: createPageUrl('Volunteer') },
    { label: 'Contact', to: createPageUrl('Contact') },
  ];

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const linkStyle = (active) => ({
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 500, fontSize: '14px',
    color: active ? '#fff' : 'rgba(26,26,46,0.7)',
    textDecoration: 'none',
    padding: '4px 12px', borderRadius: '20px',
    background: active ? '#7413dc' : 'transparent',
    transition: 'color 0.2s, background 0.2s',
    whiteSpace: 'nowrap',
  });

  const stripBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
    color: 'rgba(26,26,46,0.65)', background: 'none', border: 'none',
    cursor: 'pointer', padding: '6px 12px', borderRadius: '20px',
    whiteSpace: 'nowrap', transition: 'background 0.2s, color 0.2s',
  };

  // Shared account dropdown (used in both leader and parent strips)
  const AccountDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
            color: 'rgba(26,26,46,0.6)', background: 'rgba(116,19,220,0.04)',
            border: '0.5px solid rgba(116,19,220,0.12)', borderRadius: '20px',
            cursor: 'pointer', padding: '5px 12px 5px 10px',
            whiteSpace: 'nowrap', transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.08)'; e.currentTarget.style.color = '#7413dc'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.04)'; e.currentTarget.style.color = 'rgba(26,26,46,0.6)'; }}
        >
          <UserCircle size={14} />
          {(() => {
            const name = user?.display_name || user?.full_name || 'Account';
            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase().split(' ')[0];
          })()}
          <ChevronDown size={11} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ zIndex: 1100 }}>
        <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '13px', color: '#1a1a2e', margin: 0 }}>
            {(() => { const n = user?.display_name || user?.full_name || ''; return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(); })()}
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>{user?.email}</p>
        </div>
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('AccountSettings')} className="flex items-center gap-2 cursor-pointer">
            <Settings className="w-4 h-4" /> Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => base44.auth.logout()} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const showStrip = isLeader || isParent;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      <MobileSidebar
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        isLeader={isLeader}
        isAdmin={isAdmin}
        isParent={isParent}
        user={user}
        portalLabel={portalLabel}
        portalUrl={portalUrl}
        isPortalPage={isPortalPage}
        onLogin={() => setLoginOpen(true)}
      />

      {/* Mobile login bottom sheet — only on mobile */}
      <div className="md:hidden">
        <LoginDropdown variant="mobile" open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>

      {/* ── Outer wrapper ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        margin: '12px 24px',
        borderRadius: STRIP_RADIUS,
        overflow: 'hidden',
        boxShadow: scrolled
          ? '0 0 0 1px rgba(116,19,220,0.2), 0 8px 32px rgba(0,0,0,0.1)'
          : '0 2px 16px rgba(0,0,0,0.08)',
        border: '0.5px solid rgba(116,19,220,0.18)',
        transition: 'box-shadow 0.3s ease',
        background: '#ffffff',
      }}>

        {/* ── Pill nav row ── */}
        <div style={{
          background: '#ffffff',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transition: 'background 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
        }}>
          {/* Mobile: hamburger left */}
          <button
            className="md:hidden"
            onClick={() => setMobileDrawerOpen(true)}
            style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', padding: '4px', marginRight: '8px' }}
          >
            <Menu size={22} />
          </button>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
              alt="Syke Scouts"
              style={{ height: '48px', width: 'auto' }}
            />
          </Link>

          {/* Desktop public nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '2px' }}>
            {navLinks.map(link => (
              <Link
                key={link.label} to={link.to} style={linkStyle(isActive(link.to))}
                onMouseEnter={e => { if (!isActive(link.to)) e.currentTarget.style.color = '#7413dc'; }}
                onMouseLeave={e => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(26,26,46,0.7)'; }}
              >{link.label}</Link>
            ))}
          </div>

          {/* Desktop right CTA */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {isLeader ? (
              <button
                onClick={() => setPortalOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: (isPortalPage || portalOpen) ? '#7413dc' : 'rgba(116,19,220,0.08)',
                  color: (isPortalPage || portalOpen) ? '#fff' : '#7413dc',
                  border: 'none', borderRadius: '25px',
                  padding: '8px 18px', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <LayoutDashboard size={15} />
                Leader Portal
                <ChevronDown size={14} style={{ transform: (isPortalPage || portalOpen) ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }} />
              </button>
            ) : isParent ? (
              <button
                onClick={() => setPortalOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: (isPortalPage || portalOpen) ? '#7413dc' : 'rgba(116,19,220,0.08)',
                  color: (isPortalPage || portalOpen) ? '#fff' : '#7413dc',
                  border: 'none', borderRadius: '25px',
                  padding: '8px 18px', fontSize: '14px', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <LayoutDashboard size={15} />
                Parent Portal
                <ChevronDown size={14} style={{ transform: (isPortalPage || portalOpen) ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }} />
              </button>
            ) : portalLabel ? (
              <Link to={portalUrl} style={{
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                color: '#fff', textDecoration: 'none', background: '#7413dc',
                borderRadius: '25px', padding: '8px 22px',
              }}>{portalLabel} →</Link>
            ) : (
              <>
                {/* Login */}
                <button
                  onClick={() => setLoginOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                    color: loginOpen ? '#7413dc' : 'rgba(26,26,46,0.8)', background: loginOpen ? 'rgba(116,19,220,0.06)' : 'transparent',
                    border: `0.5px solid ${loginOpen ? 'rgba(116,19,220,0.3)' : 'rgba(26,26,46,0.25)'}`, borderRadius: '25px',
                    padding: '7px 18px', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loginOpen) e.currentTarget.style.background = 'rgba(26,26,46,0.06)'; }}
                  onMouseLeave={e => { if (!loginOpen) e.currentTarget.style.background = 'transparent'; }}
                >
                  Login
                </button>

                {/* Join Us dropdown */}
                <DropdownMenu open={joinOpen} onOpenChange={setJoinOpen}>
                  <DropdownMenuTrigger asChild>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                      color: '#fff', background: '#7413dc',
                      border: 'none', borderRadius: '25px',
                      padding: '8px 20px', cursor: 'pointer', transition: 'background 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#5c0fb0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#7413dc'; }}
                    >
                      Join Us
                      <motion.span animate={{ rotate: joinOpen ? 90 : 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} style={{ display: 'inline-flex' }}>
                        <ChevronRight size={16} />
                      </motion.span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={10} style={{ zIndex: 1100, padding: '8px', width: '300px', borderRadius: '16px', border: '1px solid rgba(116,19,220,0.12)', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                    {/* Join Scouts card */}
                    <Link to={createPageUrl('Join')} style={{ textDecoration: 'none', display: 'block' }} onClick={() => setJoinOpen(false)}>
                      <div style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #7413dc, #5c0fb0)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🏕️</div>
                        <div>
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#1a1a2e', margin: '0 0 3px' }}>Join the Scouts</p>
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '0 0 8px' }}>Adventure awaits — ages 4 to 18</p>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[['🐿️','Squirrels','4-6'],['🦫','Beavers','6-8'],['🐼','Cubs','8-10'],['🔭','Scouts','10-14']].map(([em,n,a]) => (
                              <span key={n} style={{ fontSize: '10px', background: 'rgba(116,19,220,0.08)', color: '#7413dc', padding: '2px 7px', borderRadius: '20px', fontFamily: 'DM Sans, sans-serif' }}>{em} {n} {a}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '2px 8px' }} />

                    {/* Volunteer card */}
                    <Link to={createPageUrl('Volunteer')} style={{ textDecoration: 'none', display: 'block' }} onClick={() => setJoinOpen(false)}>
                      <div style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,72,81,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #004851, #006672)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>⭐</div>
                        <div>
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '14px', color: '#1a1a2e', margin: '0 0 3px' }}>Become a Volunteer</p>
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '0 0 8px' }}>Shape young lives in your community</p>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {['🎓 No experience needed','🤝 Flexible hours','🌟 DBS provided'].map(t => (
                              <span key={t} style={{ fontSize: '10px', background: 'rgba(0,72,81,0.08)', color: '#004851', padding: '2px 7px', borderRadius: '20px', fontFamily: 'DM Sans, sans-serif' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Mobile right balance */}
          <div className="md:hidden" style={{ width: '30px' }} />
        </div>

        {/* ── Expandable portal strip (desktop) ── */}
        {showStrip && (
          <div className="hidden md:block" style={{
            overflow: 'hidden',
            maxHeight: (isPortalPage || portalOpen) ? '56px' : '0',
            transition: isPortalPage ? 'none' : 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
            background: 'rgba(255,255,255,0.97)',
          }}>
            <div style={{
              borderTop: '0.5px solid rgba(116,19,220,0.12)',
              padding: '8px 20px 10px',
              display: 'flex', alignItems: 'center',
              background: 'rgba(116,19,220,0.025)',
            }}>

              {/* Dashboard button */}
              <Link
                to={createPageUrl(isLeader ? 'LeaderDashboard' : 'ParentDashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontWeight: 600, fontSize: '12px', color: '#7413dc',
                  padding: '5px 12px', borderRadius: '20px',
                  background: 'rgba(116,19,220,0.1)', textDecoration: 'none',
                  whiteSpace: 'nowrap', flexShrink: 0, marginRight: '12px',
                }}
              >
                <LayoutDashboard size={13} /> Dashboard
              </Link>

              <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginRight: '8px' }} />

              {/* Centre nav */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                {isLeader ? (
                  /* Leader groups with dropdowns */
                  portalGroups.map((group) => {
                    const isGroupActive = group.links.some(({ page }) => location.pathname === createPageUrl(page) || location.pathname.startsWith(createPageUrl(page) + '/'));
                    return (
                      <DropdownMenu key={group.label}>
                        <DropdownMenuTrigger asChild>
                          <button
                            style={{
                              ...stripBtnStyle,
                              background: isGroupActive ? 'rgba(116,19,220,0.1)' : 'none',
                              color: isGroupActive ? '#7413dc' : 'rgba(26,26,46,0.65)',
                              fontWeight: isGroupActive ? 600 : 500,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.07)'; e.currentTarget.style.color = '#7413dc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isGroupActive ? 'rgba(116,19,220,0.1)' : 'none'; e.currentTarget.style.color = isGroupActive ? '#7413dc' : 'rgba(26,26,46,0.65)'; }}
                          >
                            <group.icon size={13} />
                            {group.label}
                            <ChevronDown size={11} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" style={{ zIndex: 1100 }}>
                          {group.links.map(({ label, page, icon: Icon, separator, adminOnly }) => {
                            if (adminOnly && !isAdmin) return null;
                            return (
                              <React.Fragment key={page}>
                                {separator && <DropdownMenuSeparator />}
                                <DropdownMenuItem asChild>
                                  <Link to={createPageUrl(page)} className="flex items-center gap-2 cursor-pointer">
                                    <Icon className="w-4 h-4" /> {label}
                                  </Link>
                                </DropdownMenuItem>
                              </React.Fragment>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })
                ) : (
                  /* Parent flat links — no dropdowns */
                  parentNavLinks.map(({ label, page, icon: Icon }) => {
                    const active = location.pathname === createPageUrl(page) || location.pathname.startsWith(createPageUrl(page) + '/');
                    return (
                      <Link
                        key={page}
                        to={createPageUrl(page)}
                        style={{
                          ...stripBtnStyle,
                          textDecoration: 'none',
                          background: active ? 'rgba(116,19,220,0.1)' : 'none',
                          color: active ? '#7413dc' : 'rgba(26,26,46,0.65)',
                          fontWeight: active ? 600 : 500,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.07)'; e.currentTarget.style.color = '#7413dc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(116,19,220,0.1)' : 'none'; e.currentTarget.style.color = active ? '#7413dc' : 'rgba(26,26,46,0.65)'; }}
                      >
                        <Icon size={13} />
                        {label}
                      </Link>
                    );
                  })
                )}
              </div>

              <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginLeft: '8px', marginRight: '8px' }} />

              {/* Right side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {isLeader && isAdmin && (
                  <Link
                    to={createPageUrl('AdminSettings')}
                    style={{ ...stripBtnStyle, textDecoration: 'none', color: 'rgba(26,26,46,0.65)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.07)'; e.currentTarget.style.color = '#7413dc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(26,26,46,0.65)'; }}
                  >
                    <Settings size={13} /> Admin Area
                  </Link>
                )}
                <AccountDropdown />
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Desktop login dropdown — anchored below the nav bar, right side.
          Rendered outside the overflow-hidden wrapper so it isn't clipped. */}
      <div className="hidden md:block">
        <LoginDropdown variant="desktop" open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
    </>
  );
}