import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  Menu, X, ChevronDown, Users, Calendar, Award, Mail, Settings,
  Image, ShieldAlert, CalendarDays, Lightbulb, Package, TrendingUp,
  FileText, Landmark, BookOpen, LogOut, LayoutDashboard, UserCheck,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Portal nav groups — each becomes a dropdown button in the strip
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
    ],
  },
  {
    label: 'Section Admin', icon: BookOpen,
    links: [
      { label: 'Communications', page: 'Communications', icon: Mail },
      { label: 'Section Accounting', page: 'SectionAccounting', icon: Landmark },
      { label: 'Gallery', page: 'LeaderGallery', icon: Image },
    ],
  },
];

const adminLink = { label: 'Admin Settings', page: 'AdminSettings', icon: Settings };

// Stable corner radius
const STRIP_RADIUS = '24px';

// Pages where the portal strip should be open by default
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
  '/AIProgrammePlanner', '/ParentPortal', '/IdeasBoard', '/RiskAssessments', '/RiskAssessmentDetail',
  '/RiskAssessmentHistory', '/AwardBadges', '/BadgeStockManagement', '/ManageBadges', '/ManageStagedBadge',
  '/EditBadgeStructure', '/Communications', '/WeeklyMessage', '/WeeklyMessageList', '/MonthlyNewsletter',
  '/MonthlyNewsletterList', '/EventUpdate', '/EventUpdateList', '/SectionAccounting', '/PORHelper',
  '/AdminSettings', '/ConsentForms', '/ConsentFormBuilder', '/NightsAwayTracking', '/JoinEnquiries',
  '/ArchivedMembers', '/MeetingDetail', '/EventDetail', '/MemberDetail', '/BadgeDetail',
  '/StagedBadgeDetail', '/GoldAwardDetail', '/HikesAwayBadgeDetail', '/NightsAwayBadgeDetail',
  '/JoiningInBadgeDetail',
];

export default function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalLabel, setPortalLabel] = useState(null);
  const [portalUrl, setPortalUrl] = useState(null);
  const location = useLocation();

  // Auto-open the portal strip on leader/parent pages
  const isPortalPage = PORTAL_PAGES.some(p => location.pathname === p || location.pathname.startsWith(p + '?'));

  // portalOpen controls manual toggle; strip visibility also uses isLeader
  const [portalOpen, setPortalOpen] = useState(false);

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
    setMenuOpen(false);
    // Sync strip open state with page type on navigation
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
    color: active ? '#7413dc' : 'rgba(26,26,46,0.7)',
    textDecoration: 'none',
    padding: '4px 12px', borderRadius: '20px',
    background: active ? 'rgba(116,19,220,0.08)' : 'transparent',
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

      {/* ── Outer wrapper — stable shape, clips everything inside ── */}
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
        background: 'rgba(255,255,255,0.97)',
      }}>

        {/* ── Pill nav row — solid fill, no border-radius animation ── */}
        <div style={{
          background: scrolled ? 'rgba(255,255,255,0.99)' : 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          transition: 'background 0.3s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px',
        }}>
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#1a1a2e', cursor: 'pointer', padding: '4px' }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* ── Expandable portal strip (desktop leaders only) ── */}
        {isLeader && (
          <div style={{
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
              {/* Dashboard — pinned left */}
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

              {/* Centred dropdown group buttons */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                {portalGroups.map((group) => (
                  <DropdownMenu key={group.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        style={stripBtnStyle}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.07)'; e.currentTarget.style.color = '#7413dc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(26,26,46,0.65)'; }}
                      >
                        <group.icon size={13} />
                        {group.label}
                        <ChevronDown size={11} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" style={{ zIndex: 1100 }}>
                      {group.links.map(({ label, page, icon: Icon }) => (
                        <DropdownMenuItem key={page} asChild>
                          <Link to={createPageUrl(page)} className="flex items-center gap-2 cursor-pointer">
                            <Icon className="w-4 h-4" /> {label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
              </div>

              <div style={{ width: '1px', height: '18px', background: 'rgba(116,19,220,0.15)', flexShrink: 0, marginLeft: '8px', marginRight: '8px' }} />

              {/* Right side: Admin Settings (if admin) + Sign out */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {isAdmin && (
                  <Link
                    to={createPageUrl('AdminSettings')}
                    style={{
                      ...stripBtnStyle, textDecoration: 'none',
                      color: 'rgba(26,26,46,0.65)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.07)'; e.currentTarget.style.color = '#7413dc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(26,26,46,0.65)'; }}
                  >
                    <Settings size={13} /> Admin Settings
                  </Link>
                )}
                <button
                  onClick={() => base44.auth.logout()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
                    color: 'rgba(26,26,46,0.6)', background: 'rgba(116,19,220,0.04)',
                    border: '0.5px solid rgba(116,19,220,0.12)', borderRadius: '20px',
                    cursor: 'pointer', padding: '5px 12px 5px 10px',
                    whiteSpace: 'nowrap', transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.04)'; e.currentTarget.style.color = 'rgba(26,26,46,0.6)'; }}
                >
                  {user?.full_name?.split(' ')[0] || 'Account'}
                  <LogOut size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile drawer ── */}
        {menuOpen && (
          <div style={{
            background: 'rgba(255,255,255,0.99)',
            borderTop: '0.5px solid rgba(116,19,220,0.1)',
            padding: '16px 20px 20px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navLinks.map(link => (
                <Link key={link.label} to={link.to} style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px',
                  color: isActive(link.to) ? '#7413dc' : 'rgba(26,26,46,0.75)',
                  textDecoration: 'none', padding: '10px 14px', borderRadius: '12px',
                  background: isActive(link.to) ? 'rgba(116,19,220,0.08)' : 'transparent',
                }}>{link.label}</Link>
              ))}

              {isLeader && (
                <div style={{ marginTop: '12px', borderTop: '0.5px solid rgba(116,19,220,0.1)', paddingTop: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(26,26,46,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px', padding: '0 4px' }}>Leader Portal</p>
                  <Link to={createPageUrl('LeaderDashboard')} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                    color: '#7413dc', textDecoration: 'none',
                    padding: '10px 14px', borderRadius: '12px', background: 'rgba(116,19,220,0.08)',
                  }}><LayoutDashboard size={16} /> Dashboard</Link>
                  {portalGroups.flatMap(g => g.links).map(({ label, page, icon: Icon }) => (
                    <Link key={page} to={createPageUrl(page)} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                      color: 'rgba(26,26,46,0.75)', textDecoration: 'none',
                      padding: '10px 14px', borderRadius: '12px',
                    }}><Icon size={15} /> {label}</Link>
                  ))}
                  {isAdmin && (
                    <Link to={createPageUrl('AdminSettings')} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                      color: 'rgba(26,26,46,0.75)', textDecoration: 'none',
                      padding: '10px 14px', borderRadius: '12px',
                    }}><Settings size={15} /> Admin Settings</Link>
                  )}
                  <button onClick={() => base44.auth.logout()} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px',
                    color: 'rgba(26,26,46,0.45)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '10px 14px', borderRadius: '12px', width: '100%', marginTop: '4px',
                  }}><LogOut size={15} /> Sign out</button>
                </div>
              )}

              {!isLeader && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  {portalLabel ? (
                    <Link to={portalUrl} style={{
                      flex: 1, textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
                      fontWeight: 500, fontSize: '14px', color: '#fff',
                      textDecoration: 'none', background: '#7413dc',
                      borderRadius: '25px', padding: '10px 18px',
                    }}>{portalLabel} →</Link>
                  ) : (
                    <>
                      <Link to={createPageUrl('Volunteer')} style={{
                        flex: 1, textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500, fontSize: '14px', color: 'rgba(26,26,46,0.8)',
                        textDecoration: 'none', border: '0.5px solid rgba(26,26,46,0.25)',
                        borderRadius: '25px', padding: '10px 18px', background: 'transparent',
                      }}>Volunteer</Link>
                      <Link to={createPageUrl('Join')} style={{
                        flex: 1, textAlign: 'center', fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500, fontSize: '14px', color: '#fff',
                        textDecoration: 'none', background: '#7413dc',
                        borderRadius: '25px', padding: '10px 18px',
                      }}>Join Us →</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spacer so page content clears the nav — taller when portal strip is visible */}
      <div style={{
        height: isPortalPage ? '136px' : (isLeader && portalOpen ? '136px' : '76px'),
      }} />
    </>
  );
}