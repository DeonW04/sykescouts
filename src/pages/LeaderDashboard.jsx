import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSectionContext } from '../components/leader/SectionContext';
import {
  Users, Calendar, Award, Mail, Settings, ArrowRight, Tent,
  ChevronDown, Image, ShieldAlert, UserCheck, CalendarDays, Receipt,
  Lightbulb, Package, TrendingUp, FileText, Landmark, BookOpen,
  LayoutDashboard, Star, Zap,
} from 'lucide-react';
import ActionsDrilldownModal from '../components/leader/ActionsDrilldownModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

// ── Shared card style ──────────────────────────────────────────────────────────
const glassCard = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(116,19,220,0.1)',
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const UpcomingMeetings = ({ sections, selectedSection }) => {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: programmes = [] } = useQuery({
    queryKey: ['upcoming-programmes', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return [];
      const all = await base44.entities.Programme.filter({});
      return all
        .filter(p => sectionIds.includes(p.section_id) && new Date(p.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    },
    enabled: sectionIds.length > 0,
  });

  return (
    <div style={glassCard}>
      <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} color="#7413dc" />
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Upcoming Meetings</h3>
        </div>
        <button
          onClick={() => navigate(createPageUrl('LeaderProgramme'))}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7413dc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
        >
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div style={{ padding: '16px 24px 24px' }}>
        {programmes.length === 0 ? (
          <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No upcoming meetings scheduled</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {programmes.map(p => {
              const section = sections.find(s => s.id === p.section_id);
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(createPageUrl('MeetingDetail') + `?sectionId=${p.section_id}&date=${p.date}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                    background: 'rgba(116,19,220,0.03)', border: '1px solid rgba(116,19,220,0.07)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(116,19,220,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(116,19,220,0.03)'}
                >
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#1a1a2e', margin: 0 }}>{p.title}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>
                      {section?.display_name} · {format(new Date(p.date), 'EEE, d MMM')}
                    </p>
                  </div>
                  <ArrowRight size={14} color="rgba(116,19,220,0.4)" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const UpcomingEvents = ({ sections, selectedSection }) => {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: events = [] } = useQuery({
    queryKey: ['upcoming-events-dashboard', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return [];
      const all = await base44.entities.Event.filter({});
      return all
        .filter(e => e.section_ids?.some(sid => sectionIds.includes(sid)) && new Date(e.start_date) >= new Date())
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 4);
    },
    enabled: sectionIds.length > 0,
  });

  return (
    <div style={glassCard}>
      <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tent size={16} color="#7413dc" />
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Upcoming Events</h3>
        </div>
        <button
          onClick={() => navigate(createPageUrl('LeaderEvents'))}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7413dc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
        >
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div style={{ padding: '16px 24px 24px' }}>
        {events.length === 0 ? (
          <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No upcoming events</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.map(e => (
              <div
                key={e.id}
                onClick={() => navigate(createPageUrl('EventDetail') + `?id=${e.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                  background: 'rgba(116,19,220,0.03)', border: '1px solid rgba(116,19,220,0.07)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={el => el.currentTarget.style.background = 'rgba(116,19,220,0.08)'}
                onMouseLeave={el => el.currentTarget.style.background = 'rgba(116,19,220,0.03)'}
              >
                <div style={{ width: '34px', height: '34px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tent size={16} color="#7413dc" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#1a1a2e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>{format(new Date(e.start_date), 'EEE, d MMM yyyy')} · {e.type}</p>
                </div>
                <ArrowRight size={14} color="rgba(116,19,220,0.4)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BadgesDue = ({ sections, selectedSection }) => {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: awards = [] } = useQuery({ queryKey: ['awards'], queryFn: () => base44.entities.MemberBadgeAward.filter({ award_status: 'pending' }) });

  const relevantAwards = awards.filter(a => {
    const member = members.find(m => m.id === a.member_id);
    return member && sectionIds.includes(member.section_id);
  });

  const uniqueMembers = new Set(relevantAwards.map(a => a.member_id)).size;
  if (relevantAwards.length === 0) return null;

  return (
    <div
      onClick={() => navigate(createPageUrl('AwardBadges'))}
      style={{
        ...glassCard,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.08) 100%)',
        border: '1px solid rgba(34,197,94,0.2)',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.14) 0%, rgba(16,185,129,0.14) 100%)'}
      onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.08) 100%)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', background: '#22c55e', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Award size={18} color="#fff" />
        </div>
        <div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#1a1a2e', margin: 0 }}>Badges Ready to Award</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>{uniqueMembers} {uniqueMembers === 1 ? 'member' : 'members'} waiting</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '26px', color: '#22c55e' }}>{relevantAwards.length}</span>
        <ArrowRight size={14} color="#22c55e" />
      </div>
    </div>
  );
};

const ActionsStatus = ({ sections, selectedSection }) => {
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);
  const [drilldown, setDrilldown] = useState(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['actions-status-dashboard', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return null;
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [allActions, allAssignments, allResponses, allEvents, allProgrammes] = await Promise.all([
        base44.entities.ActionRequired.filter({}),
        base44.entities.ActionAssignment.filter({}),
        base44.entities.ActionResponse.filter({}),
        base44.entities.Event.filter({}),
        base44.entities.Programme.filter({}),
      ]);
      const relevantActions = allActions.filter(a => {
        if (!a.is_open) return false;
        if (a.event_id) {
          const ev = allEvents.find(e => e.id === a.event_id);
          if (!ev || new Date(ev.start_date) < now) return false;
          return ev.section_ids?.some(sid => sectionIds.includes(sid));
        }
        if (a.programme_id) {
          const prog = allProgrammes.find(p => p.id === a.programme_id);
          if (!prog || new Date(prog.date) < now) return false;
          return sectionIds.includes(prog.section_id);
        }
        return false;
      });
      const actionIds = relevantActions.map(a => a.id);
      const relevantAssignments = allAssignments.filter(a => actionIds.includes(a.action_required_id));
      const relevantResponses = allResponses.filter(r => actionIds.includes(r.action_required_id) && r.response_value);
      const respondedPairs = new Set(relevantResponses.map(r => `${r.action_required_id}:${r.member_id}`));
      const unrespondedAssignments = relevantAssignments.filter(a => !respondedPairs.has(`${a.action_required_id}:${a.member_id}`));
      const unrespondedMemberIds = new Set(unrespondedAssignments.map(a => a.member_id));
      const closingSoon = relevantActions.filter(a => a.deadline && new Date(a.deadline) <= sevenDays && new Date(a.deadline) >= now);
      const responseRate = relevantAssignments.length > 0 ? Math.round((relevantResponses.length / relevantAssignments.length) * 100) : 100;
      const allMembers = await base44.entities.Member.filter({ active: true });
      return {
        totalActions: relevantActions.length, responseRate,
        unresponded: unrespondedAssignments.length,
        unrespondedMembers: unrespondedMemberIds.size,
        closingSoon: closingSoon.length,
        attendanceActions: relevantActions.filter(a => a.action_purpose === 'attendance').length,
        consentActions: relevantActions.filter(a => a.action_purpose === 'consent' || a.action_purpose === 'consent_form').length,
        volunteerActions: relevantActions.filter(a => a.action_purpose === 'volunteer').length,
        _relevantActions: relevantActions, _relevantAssignments: relevantAssignments,
        _relevantResponses: relevantResponses, _closingSoonActions: closingSoon,
        _unrespondedAssignments: unrespondedAssignments, _allMembers: allMembers,
        _allEvents: allEvents, _allProgrammes: allProgrammes,
      };
    },
    enabled: sectionIds.length > 0,
  });

  if (isLoading || !stats) return null;

  const drilldownData = {
    relevantActions: stats._relevantActions || [], relevantAssignments: stats._relevantAssignments || [],
    relevantResponses: stats._relevantResponses || [], closingSoonActions: stats._closingSoonActions || [],
    unrespondedAssignments: stats._unrespondedAssignments || [], allMembers: stats._allMembers || [],
    allEvents: stats._allEvents || [], allProgrammes: stats._allProgrammes || [],
  };

  const statCards = [
    { label: 'Active Actions', value: stats.totalActions, color: '#7413dc', bg: 'rgba(116,19,220,0.07)', drilldownType: 'totalActions' },
    { label: 'Response Rate', value: `${stats.responseRate}%`, color: stats.responseRate >= 75 ? '#22c55e' : stats.responseRate >= 50 ? '#f97316' : '#ef4444', bg: stats.responseRate >= 75 ? 'rgba(34,197,94,0.07)' : stats.responseRate >= 50 ? 'rgba(249,115,22,0.07)' : 'rgba(239,68,68,0.07)' },
    { label: 'Awaiting Response', value: stats.unresponded, color: stats.unresponded === 0 ? '#22c55e' : '#f97316', bg: stats.unresponded === 0 ? 'rgba(34,197,94,0.07)' : 'rgba(249,115,22,0.07)', drilldownType: 'unresponded' },
    { label: 'Members Outstanding', value: stats.unrespondedMembers, color: stats.unrespondedMembers === 0 ? '#22c55e' : '#ef4444', bg: stats.unrespondedMembers === 0 ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', drilldownType: 'unrespondedMembers' },
    { label: 'Closing in 7 Days', value: stats.closingSoon, color: stats.closingSoon > 0 ? '#f59e0b' : 'rgba(26,26,46,0.4)', bg: stats.closingSoon > 0 ? 'rgba(245,158,11,0.07)' : 'rgba(26,26,46,0.03)', drilldownType: 'closingSoon' },
    { label: 'Attendance', value: stats.attendanceActions, color: '#6366f1', bg: 'rgba(99,102,241,0.07)', drilldownType: 'attendanceActions' },
    { label: 'Consent', value: stats.consentActions, color: '#14b8a6', bg: 'rgba(20,184,166,0.07)', drilldownType: 'consentActions' },
    { label: 'Volunteer', value: stats.volunteerActions, color: '#ec4899', bg: 'rgba(236,72,153,0.07)', drilldownType: 'volunteerActions' },
  ];

  return (
    <>
      <div style={glassCard}>
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#7413dc" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Actions Required</h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>Active actions for upcoming meetings & events · click a card for details</p>
          </div>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          {stats.totalActions === 0 ? (
            <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No active actions for upcoming sessions</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {statCards.map(stat => (
                <button
                  key={stat.label}
                  onClick={() => stat.drilldownType ? setDrilldown(stat.drilldownType) : null}
                  style={{
                    background: stat.bg, borderRadius: '14px', padding: '14px 12px',
                    textAlign: 'center', border: 'none', cursor: stat.drilldownType ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => { if (stat.drilldownType) e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '24px', color: stat.color, margin: 0 }}>{stat.value}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.5)', margin: '4px 0 0', lineHeight: 1.3 }}>{stat.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <ActionsDrilldownModal open={!!drilldown} onClose={() => setDrilldown(null)} type={drilldown} data={drilldownData} />
    </>
  );
};

// ── Quick action tiles ─────────────────────────────────────────────────────────
const quickActions = (user) => [
  {
    icon: Users, label: 'Members', accent: '#3b82f6',
    dropdown: [
      { label: 'Member Details', page: 'LeaderMembers', icon: Users },
      { label: 'Attendance', page: 'LeaderAttendance', icon: UserCheck },
      { label: 'Parent Portal', page: 'ParentPortal', icon: Users },
    ],
  },
  {
    icon: Calendar, label: 'Programme', accent: '#7413dc',
    dropdown: [
      { label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar },
      { label: 'Events', page: 'LeaderEvents', icon: CalendarDays },
      { label: 'Ideas Board', page: 'IdeasBoard', icon: Lightbulb },
    ],
  },
  {
    icon: ShieldAlert, label: 'Safety', accent: '#f97316',
    dropdown: [
      { label: 'Risk Assessments', page: 'RiskAssessments', icon: ShieldAlert },
      { label: 'Consent Forms', page: 'ConsentForms', icon: FileText },
    ],
  },
  {
    icon: Award, label: 'Badges', accent: '#22c55e',
    dropdown: [
      { label: 'Badge Tracking', page: 'LeaderBadges', icon: Award },
      { label: 'Due Badges', page: 'AwardBadges', icon: TrendingUp },
      { label: 'Badge Stock', page: 'BadgeStockManagement', icon: Package },
      ...(user?.role === 'admin' ? [{ label: 'Manage Badges', page: 'ManageBadges', icon: Settings, separator: true }] : []),
    ],
  },
  {
    icon: BookOpen, label: 'Section Admin', accent: '#14b8a6',
    dropdown: [
      { label: 'Communications', page: 'Communications', icon: Mail },
      { label: 'Section Accounting', page: 'SectionAccounting', icon: Landmark },
      ...(['admin', 'treasurer', 'glv', 'team_leader'].includes(user?.role) ? [{ label: 'Treasurer Portal', page: 'TreasurerDashboard', icon: Landmark, separator: true }] : []),
    ],
  },
  { icon: Image, label: 'Gallery', accent: '#ec4899', page: 'LeaderGallery' },
];

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LeaderDashboard() {
  const [user, setUser] = useState(null);
  const [leader, setLeader] = useState(null);
  const { selectedSection } = useSectionContext();

  useEffect(() => { loadUserData(); }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    if (currentUser.role !== 'admin') {
      const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
      if (leaders.length > 0) setLeader(leaders[0]);
    }
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', leader],
    queryFn: async () => {
      const all = await base44.entities.Section.filter({ active: true });
      if (user?.role === 'admin') return all;
      if (!leader) return [];
      return all.filter(s => leader.section_ids?.includes(s.id));
    },
    enabled: !!user,
  });

  const { data: totalMembers = 0 } = useQuery({
    queryKey: ['total-members', sections],
    queryFn: async () => {
      if (sections.length === 0) return 0;
      const sectionIds = sections.map(s => s.id);
      const members = await base44.entities.Member.filter({ active: true });
      return members.filter(m => sectionIds.includes(m.section_id)).length;
    },
    enabled: sections.length > 0,
  });

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7ff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(116,19,220,0.2)', borderTopColor: '#7413dc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', color: 'rgba(26,26,46,0.5)', fontSize: '14px' }}>Loading your portal...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const actions = quickActions(user);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f7ff 0%, #ede9ff 60%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>

      {/* ── Hero header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1a5e 60%, #1a1a2e 100%)',
        padding: '56px 40px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'rgba(116,19,220,0.15)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '20%', width: '200px', height: '200px', background: 'rgba(116,19,220,0.08)', borderRadius: '50%', filter: 'blur(40px)' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '10px' }}>
              Leader Portal
            </p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(28px, 4vw, 44px)', color: '#fff', margin: '0 0 8px', lineHeight: 1.1 }}>
              Welcome back, {user.display_name || user.full_name?.split(' ')[0]}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', margin: 0 }}>
              {sections.length > 0
                ? `Managing ${sections.map(s => s.display_name).join(', ')} · ${totalMembers} active members`
                : '40th Rochdale (Syke) Scouts'}
            </p>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '14px 20px', textAlign: 'center', minWidth: '80px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '24px', color: '#fff', margin: 0 }}>{totalMembers}</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Members</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '14px 20px', textAlign: 'center', minWidth: '80px' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '24px', color: '#fff', margin: 0 }}>{sections.length}</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sections</p>
            </div>
            {user.role === 'admin' && (
              <Link
                to={createPageUrl('AdminSettings')}
                style={{
                  background: 'rgba(116,19,220,0.3)', border: '1px solid rgba(116,19,220,0.5)',
                  borderRadius: '16px', padding: '14px 20px', display: 'flex',
                  alignItems: 'center', gap: '8px', textDecoration: 'none',
                  color: '#fff', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
                }}
              >
                <Settings size={16} />
                Admin Settings
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 40px 0' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.35)', marginBottom: '16px' }}>Quick access</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {actions.map(action => (
            action.dropdown ? (
              <DropdownMenu key={action.label}>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    background: 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${action.accent}22`,
                    borderRadius: '18px',
                    padding: '20px 12px',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${action.accent}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; }}
                  >
                    <div style={{ width: '44px', height: '44px', background: `${action.accent}18`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <action.icon size={20} color={action.accent} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a2e' }}>{action.label}</span>
                      <ChevronDown size={12} color="rgba(26,26,46,0.4)" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {action.dropdown.map(sub => (
                    <React.Fragment key={sub.page}>
                      {sub.separator && <DropdownMenuSeparator />}
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(sub.page)} className="flex items-center gap-2 cursor-pointer">
                          <sub.icon className="w-4 h-4" />
                          {sub.label}
                        </Link>
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link key={action.label} to={createPageUrl(action.page)} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${action.accent}22`,
                  borderRadius: '18px',
                  padding: '20px 12px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${action.accent}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)'; }}
                >
                  <div style={{ width: '44px', height: '44px', background: `${action.accent}18`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <action.icon size={20} color={action.accent} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1a1a2e', fontFamily: 'DM Sans, sans-serif' }}>{action.label}</span>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── Dashboard content ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px' }}>
        <BadgesDue sections={sections} selectedSection={selectedSection} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
          <UpcomingMeetings sections={sections} selectedSection={selectedSection} />
          <UpcomingEvents sections={sections} selectedSection={selectedSection} />
        </div>

        <div style={{ marginTop: '20px' }}>
          <ActionsStatus sections={sections} selectedSection={selectedSection} />
        </div>

        {/* Receipt upload CTA */}
        <div
          style={{
            marginTop: '20px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1a5e 100%)',
            borderRadius: '20px', padding: '24px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', background: 'rgba(116,19,220,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={20} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#fff', margin: 0 }}>Upload Receipts</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '3px 0 0' }}>Submit your expenses for reimbursement</p>
            </div>
          </div>
          <Link
            to={createPageUrl('ReceiptUploader')}
            style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
              color: '#1a1a2e', background: '#fff', textDecoration: 'none',
              borderRadius: '25px', padding: '10px 24px',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'opacity 0.2s',
            }}
          >
            <Receipt size={15} /> Upload Receipt
          </Link>
        </div>
      </div>
    </div>
  );
}