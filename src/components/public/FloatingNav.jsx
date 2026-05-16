import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  Menu, X, ChevronDown, ChevronRight, Users, Calendar, Award, Mail, Settings,
  Image, ShieldAlert, CalendarDays, Lightbulb, Package, TrendingUp,
  FileText, Landmark, BookOpen, LogOut, LayoutDashboard, UserCheck, Home, UserCircle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Portal nav groups
const portalGroups = [
  {
    label: 'Members', icon: Users,
    links: [
      { label: 'Member Details', page: 'LeaderMembers', icon: Users },
      { label: 'Attendance', page: 'LeaderAttendance', icon: UserCheck },
      { label: 'Parent Portal', page: 'ParentPortal', icon: Users },
    ],
  },
  {
    label: 'Programme', icon: Calendar,
    links: [
      { label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar },
      { label: 'Events', page: 'LeaderEvents', icon: CalendarDays },
      { label: 'Ideas Board', page: 'IdeasBoard', icon: Lightbulb },
    ],
  },
  {
    label: 'Safety', icon: ShieldAlert,
    links: [
      { label: 'Risk Assessments', page: 'RiskAssessments', icon: ShieldAlert },
      { label: 'Consent Forms', page: 'ConsentForms', icon: FileText },
    ],
  },
  {
    label: 'Badges', icon: Award,
    links: [
      { label: 'Badge Tracking', page: 'LeaderBadges', icon: Award },
      { label: 'Due Badges', page: 'AwardBadges', icon: TrendingUp },
      { label: 'Badge Stock', page: 'BadgeStockManagement', icon: Package },
      { label: 'Manage Badges', page: 'ManageBadges', icon: Settings, separator: true, adminOnly: true },
    ],
  },
  {
    label: 'Section Admin', icon: BookOpen,
    links: [
      { label: 'Communications', page: 'Communications', icon: Mail },
      { label: 'Section Accounting', page: 'SectionAccounting', icon: Landmark },
      { label: 'Gallery', page: 'LeaderGallery', icon: Image },
      { label: 'Treasurer Portal', page: 'TreasurerDashboard', icon: Landmark, separator: true },
    ],
  },
];

const STRIP_RADIUS = '24px';

const PORTAL_PAGES = [
  '/LeaderDashboard', '/LeaderMembers', '/LeaderProgramme', '/LeaderEvents',
  '/LeaderAttendance', '/LeaderBadges', '/LeaderGallery', '/MeetingDetail',
  '/EventDetail', '/MemberDetail', '/BadgeDetail', '/AwardBadges', '/ManageBadges',
  '/RiskAssessments', '/RiskAssessmentDetail', '/Communications', '/WeeklyMessage',
  '/WeeklyMessageList', '/MonthlyNewsletter', '/MonthlyNewsletterList', '/EventUpdate',
  '/EventUpdateList', '/IdeasBoard', '/JoinEnquiries', '/ArchivedMembers',
  '/BadgeStockManagement', '/NightsAwayTracking', '/ConsentForms', '/ConsentFormBuilder',
  '/SectionAccounting', '/AdminSettings', '/ParentDashboard', '/MyChild',
  '/ParentProgramme', '/ParentEvents', '/ParentEventDetail', '/ParentBadges', '/ParentGoldAward',
  '/AIProgrammePlanner', '/ParentPortal', '/RiskAssessmentHistory',
  '/ManageStagedBadge', '/EditBadgeStructure', '/PORHelper',
  '/StagedBadgeDetail', '/GoldAwardDetail', '/HikesAwayBadgeDetail', '/NightsAwayBadgeDetail',
  '/JoiningInBadgeDetail',
];

// ── Mobile Sidebar Drawer ──────────────────────────────────────────────────────
function MobileSidebar({ open, onClose, isLeader, isAdmin, user, portalLabel, portalUrl }) {
  const location = useLocation();
  const [expandedGroup, setExpandedGroup] = useState(null);

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'About', to: createPageUrl('About') },
    { label: 'Gallery', to: createPageUrl('Gallery') },
    { label: 'Join', to: createPageUrl('Join') },
    { label: 'Volunteer', to: createPageUrl('Volunteer') },
    { label: 'Contact', to: createPageUrl('Contact') },
  ];

  const isActive = (to) => to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
        background: '#1a1a2e', zIndex: 1060,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Drawer header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>40th Rochdale Scouts</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>{user?.full_name?.split(' ')[0] || 'Menu'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Nav content */}
        <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>

          {/* Public links */}
          {navLinks.map(link => (
            <Link key={link.label} to={link.to} onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              color: isActive(link.to) ? '#fff' : 'rgba(255,255,255,0.6)',
              textDecoration: 'none', padding: '10px 12px', borderRadius: '10px',
              background: isActive(link.to) ? 'rgba(116,19,220,0.4)' : 'transparent',
              marginBottom: '2px',
            }}>{link.label}</Link>
          ))}

          {/* Leader portal section */}
          {isLeader && (
            <>
              <div style={{ margin: '14px 0 8px', padding: '0 12px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Leader Portal</p>
              </div>

              {/* Dashboard */}
              <Link to={createPageUrl('LeaderDashboard')} onClick={onClose} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
                color: '#fff', textDecoration: 'none', padding: '10px 12px', borderRadius: '10px',
                background: 'rgba(116,19,220,0.3)', marginBottom: '2px',
              }}><LayoutDashboard size={15} /> Dashboard</Link>

              {/* Groups */}
              {portalGroups.map(group => (
                <div key={group.label}>
                  <button
                    onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '10px', background: 'transparent', border: 'none',
                      cursor: 'pointer', marginBottom: '2px', color: 'rgba(255,255,255,0.65)',
                      fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <group.icon size={15} /> {group.label}
                    </div>
                    <ChevronRight size={13} style={{ transform: expandedGroup === group.label ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255,255,255,0.3)' }} />
                  </button>
                  {expandedGroup === group.label && (
                    <div style={{ paddingLeft: '12px', marginBottom: '4px' }}>
                      {group.links.map(({ label, page, icon: Icon }) => (
                        <Link key={page} to={createPageUrl(page)} onClick={onClose} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500,
                          color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                          padding: '8px 12px', borderRadius: '8px', marginBottom: '1px',
                        }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                          {label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isAdmin && (
                <Link to={createPageUrl('AdminSettings')} onClick={onClose} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                  color: 'rgba(255,255,255,0.65)', textDecoration: 'none', padding: '10px 12px', borderRadius: '10px',
                  marginBottom: '2px',
                }}><Settings size={15} /> Admin Settings</Link>
              )}
            </>
          )}

          {/* Parent portal */}
          {!isLeader && portalLabel && (
            <Link to={portalUrl} onClick={onClose} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px',
              color: '#fff', textDecoration: 'none', padding: '10px 12px', borderRadius: '10px',
              background: 'rgba(116,19,220,0.3)', marginTop: '14px', marginBottom: '2px',
            }}><LayoutDashboard size={15} /> {portalLabel}</Link>
          )}

          {!user && (
            <button onClick={() => { base44.auth.redirectToLogin(); onClose(); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              color: '#fff', background: '#7413dc', border: 'none', cursor: 'pointer',
              padding: '10px 12px', borderRadius: '10px', marginTop: '14px',
            }}>Sign In</button>
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
  const [portalLabel, setPortalLabel] = useState(null);
  const [portalUrl, setPortalUrl] = useState(null);
  const [portalOpen, setPortalOpen] = useState(false);
  const location = useLocation();

  const isPortalPage = PORTAL_PAGES.some(p => location.pathname === p || location.pathname.startsWith(p + '?'));

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

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      <MobileSidebar
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        isLeader={isLeader}
        isAdmin={isAdmin}
        user={user}
        portalLabel={portalLabel}
        portalUrl={portalUrl}
      />

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

          {/* Logo — centred on mobile, left on desktop */}
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
            ) : portalLabel ? (
              <Link to={portalUrl} style={{
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                color: '#fff', textDecoration: 'none', background: '#7413dc',
                borderRadius: '25px', padding: '8px 22px',
              }}>{portalLabel} →</Link>
            ) : (
              <>
                <Link to={createPageUrl('Volunteer')} style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                  color: 'rgba(26,26,46,0.8)', textDecoration: 'none',
                  border: '0.5px solid rgba(26,26,46,0.25)', borderRadius: '25px',
                  padding: '7px 18px', background: 'transparent',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,26,46,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >Volunteer</Link>
                <Link to={createPageUrl('Join')} style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                  color: '#fff', textDecoration: 'none', background: '#7413dc',
                  borderRadius: '25px', padding: '8px 20px',
                }}>Join Us →</Link>
              </>
            )}
          </div>

          {/* Mobile right — logo placeholder for centering balance (empty) */}
          <div className="md:hidden" style={{ width: '30px' }} />
        </div>

        {/* ── Expandable portal strip (desktop leaders only) ── */}
        {isLeader && (
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
              <Link
                to={createPageUrl('LeaderDashboard')}
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

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                {portalGroups.map((group) => {
                  const isGroupActive = group.links.some(({ page }) => location.pathname === '/' + page || location.pathname.startsWith('/' + page));
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
                })}
              </div>

              <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginLeft: '8px', marginRight: '8px' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {isAdmin && (
                  <Link
                    to={createPageUrl('AdminSettings')}
                    style={{ ...stripBtnStyle, textDecoration: 'none', color: 'rgba(26,26,46,0.65)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.07)'; e.currentTarget.style.color = '#7413dc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(26,26,46,0.65)'; }}
                  >
                    <Settings size={13} /> Admin Settings
                  </Link>
                )}
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
                    <DropdownMenuItem onClick={() => base44.auth.logout()} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}
      </div>


    </>
  );
}