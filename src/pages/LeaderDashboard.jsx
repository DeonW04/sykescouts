import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSectionContext } from '../components/leader/SectionContext';
import {
  Users, Calendar, Award, Mail, Settings, ArrowRight, Tent,
  ChevronDown, Image, ShieldAlert, UserCheck, CalendarDays, Receipt,
  Lightbulb, Package, TrendingUp, FileText, Landmark, BookOpen, Zap, Star,
} from 'lucide-react';
import ActionsDrilldownModal from '../components/leader/ActionsDrilldownModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, isThisWeek, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import FloatingNav from '../components/public/FloatingNav';
import { SectionProvider } from '../components/leader/SectionContext';
import SectionTransitionOverlay from '../components/leader/SectionTransitionOverlay';

const glassCard = {
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(116,19,220,0.1)',
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
};

// ── Section Selector (chip-style, sits in hero) ────────────────────────────────
function InlineSectionSelector() {
  const { selectedSection, setSelectedSection, availableSections, loading, user } = useSectionContext();
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [defaultSection, setDefaultSection] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading || availableSections.length <= 1) return null;

  const currentDefault = user?.default_section_id;

  const handleSaveDefault = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ default_section_id: defaultSection });
      toast.success('Default section saved');
      setShowDefaultDialog(false);
    } catch {
      toast.error('Failed to save default section');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(26,26,46,0.4)', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Viewing section</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {availableSections.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSection(s.id)}
              style={{
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
                padding: '6px 14px', borderRadius: '25px', border: 'none', cursor: 'pointer',
                transition: 'all 0.2s',
                background: selectedSection === s.id ? '#7413dc' : 'rgba(116,19,220,0.07)',
                color: selectedSection === s.id ? '#fff' : 'rgba(26,26,46,0.6)',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {s.display_name}
              {s.id === currentDefault && <Star size={10} color={selectedSection === s.id ? 'rgba(255,255,255,0.7)' : '#f59e0b'} fill={selectedSection === s.id ? 'rgba(255,255,255,0.7)' : '#f59e0b'} />}
            </button>
          ))}
          <button
            onClick={() => { setDefaultSection(currentDefault || selectedSection || availableSections[0]?.id); setShowDefaultDialog(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(26,26,46,0.3)', display: 'flex', alignItems: 'center' }}
            title="Set default section"
          >
            <Star size={14} />
          </button>
        </div>
      </div>

      <Dialog open={showDefaultDialog} onOpenChange={setShowDefaultDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Set Default Section
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">Choose which section opens by default when you log in.</p>
          <div className="space-y-2 mt-2">
            {availableSections.map(s => (
              <button key={s.id} onClick={() => setDefaultSection(s.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${defaultSection === s.id ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {s.display_name}
                {defaultSection === s.id && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </button>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDefaultDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDefault} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? 'Saving…' : 'Save Default'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── This Week's Meeting (hero variant — horizontal compact) ───────────────────
function ThisWeeksMeeting({ sections, selectedSection }) {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['this-weeks-meeting', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return null;
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const all = await base44.entities.Programme.filter({});
      const thisWeek = all
        .filter(p => {
          const d = parseISO(p.date);
          return sectionIds.includes(p.section_id) && d >= weekStart && d <= weekEnd;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      return thisWeek[0] || null;
    },
    enabled: sectionIds.length > 0,
  });

  const section = meeting ? sections.find(s => s.id === meeting.section_id) : null;

  if (isLoading) return (
    <div style={{ height: '56px', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '20px', height: '20px', border: '2px solid rgba(116,19,220,0.15)', borderTopColor: '#7413dc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div
      style={{
        background: 'rgba(116,19,220,0.06)',
        border: '1px solid rgba(116,19,220,0.12)',
        borderRadius: '16px',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        cursor: meeting ? 'pointer' : 'default',
        transition: 'background 0.2s',
      }}
      onClick={() => meeting && navigate(createPageUrl('MeetingDetail') + `?sectionId=${meeting.section_id}&date=${meeting.date}`)}
      onMouseEnter={e => { if (meeting) e.currentTarget.style.background = 'rgba(116,19,220,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(116,19,220,0.06)'; }}
    >
      <div style={{ width: '36px', height: '36px', background: '#7413dc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Calendar size={17} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#7413dc', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 2px' }}>This Week's Meeting</p>
        {meeting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>{meeting.title}</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.5)' }}>{format(parseISO(meeting.date), 'EEEE, d MMMM')}</span>
            {section?.meeting_start_time && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.5)' }}>
                · {section.meeting_start_time}{section.meeting_end_time ? `–${section.meeting_end_time}` : ''}
              </span>
            )}
            {section && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#7413dc', background: 'rgba(116,19,220,0.1)', padding: '2px 9px', borderRadius: '20px', fontWeight: 500 }}>{section.display_name}</span>}
          </div>
        ) : (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>No meeting scheduled this week</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={e => { e.stopPropagation(); navigate(createPageUrl('LeaderProgramme')); }}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7413dc', background: 'rgba(116,19,220,0.1)', border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: '20px', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {meeting ? 'View Programme' : 'Add Meeting'}
        </button>
        {meeting && <ArrowRight size={16} color="rgba(116,19,220,0.4)" />}
      </div>
    </div>
  );
}

// ── Upcoming Meetings ──────────────────────────────────────────────────────────
function UpcomingMeetings({ sections, selectedSection }) {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: programmes = [] } = useQuery({
    queryKey: ['upcoming-programmes', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return [];
      const all = await base44.entities.Programme.filter({});
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      return all
        .filter(p => sectionIds.includes(p.section_id) && new Date(p.date) > weekEnd)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4);
    },
    enabled: sectionIds.length > 0,
  });

  return (
    <div style={glassCard}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={16} color="#7413dc" />
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Upcoming Meetings</h3>
        </div>
        <button onClick={() => navigate(createPageUrl('LeaderProgramme'))}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7413dc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div style={{ padding: '14px 24px 20px' }}>
        {programmes.length === 0 ? (
          <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No upcoming meetings after this week</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {programmes.map(p => {
              const section = sections.find(s => s.id === p.section_id);
              return (
                <div key={p.id}
                  onClick={() => navigate(createPageUrl('MeetingDetail') + `?sectionId=${p.section_id}&date=${p.date}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(116,19,220,0.03)', border: '1px solid rgba(116,19,220,0.06)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(116,19,220,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(116,19,220,0.03)'}
                >
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#1a1a2e', margin: 0 }}>{p.title}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>
                      {section?.display_name} · {format(parseISO(p.date), 'EEE, d MMM')}
                    </p>
                  </div>
                  <ArrowRight size={14} color="rgba(116,19,220,0.35)" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upcoming Events ────────────────────────────────────────────────────────────
function UpcomingEvents({ sections, selectedSection }) {
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
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tent size={16} color="#7413dc" />
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Upcoming Events</h3>
        </div>
        <button onClick={() => navigate(createPageUrl('LeaderEvents'))}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#7413dc', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
          View all <ArrowRight size={13} />
        </button>
      </div>
      <div style={{ padding: '14px 24px 20px' }}>
        {events.length === 0 ? (
          <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No upcoming events</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {events.map(e => (
              <div key={e.id}
                onClick={() => navigate(createPageUrl('EventDetail') + `?id=${e.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', cursor: 'pointer', background: 'rgba(116,19,220,0.03)', border: '1px solid rgba(116,19,220,0.06)', transition: 'background 0.2s' }}
                onMouseEnter={el => el.currentTarget.style.background = 'rgba(116,19,220,0.07)'}
                onMouseLeave={el => el.currentTarget.style.background = 'rgba(116,19,220,0.03)'}
              >
                <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tent size={15} color="#7413dc" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '14px', color: '#1a1a2e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>{format(new Date(e.start_date), 'EEE, d MMM yyyy')} · {e.type}</p>
                </div>
                <ArrowRight size={14} color="rgba(116,19,220,0.35)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Badges Due ─────────────────────────────────────────────────────────────────
function BadgesDue({ sections, selectedSection }) {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: awards = [] } = useQuery({ queryKey: ['awards'], queryFn: () => base44.entities.MemberBadgeAward.filter({ award_status: 'pending' }) });
  const relevantAwards = awards.filter(a => { const m = members.find(m => m.id === a.member_id); return m && sectionIds.includes(m.section_id); });
  const uniqueMembers = new Set(relevantAwards.map(a => a.member_id)).size;
  if (relevantAwards.length === 0) return null;
  return (
    <div onClick={() => navigate(createPageUrl('AwardBadges'))} style={{ ...glassCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(16,185,129,0.07) 100%)', border: '1px solid rgba(34,197,94,0.18)', transition: 'background 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.12) 100%)'}
      onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(16,185,129,0.07) 100%)'}
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
}

// ── Actions Status ─────────────────────────────────────────────────────────────
function ActionsStatus({ sections, selectedSection }) {
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
        base44.entities.ActionRequired.filter({}), base44.entities.ActionAssignment.filter({}),
        base44.entities.ActionResponse.filter({}), base44.entities.Event.filter({}),
        base44.entities.Programme.filter({}),
      ]);
      const relevantActions = allActions.filter(a => {
        if (!a.is_open) return false;
        if (a.event_id) { const ev = allEvents.find(e => e.id === a.event_id); if (!ev || new Date(ev.start_date) < now) return false; return ev.section_ids?.some(sid => sectionIds.includes(sid)); }
        if (a.programme_id) { const prog = allProgrammes.find(p => p.id === a.programme_id); if (!prog || new Date(prog.date) < now) return false; return sectionIds.includes(prog.section_id); }
        return false;
      });
      const actionIds = relevantActions.map(a => a.id);
      const relevantAssignments = allAssignments.filter(a => actionIds.includes(a.action_required_id));
      const relevantResponses = allResponses.filter(r => actionIds.includes(r.action_required_id) && r.response_value);
      const respondedPairs = new Set(relevantResponses.map(r => `${r.action_required_id}:${r.member_id}`));
      const unrespondedAssignments = relevantAssignments.filter(a => !respondedPairs.has(`${a.action_required_id}:${a.member_id}`));
      const closingSoon = relevantActions.filter(a => a.deadline && new Date(a.deadline) <= sevenDays && new Date(a.deadline) >= now);
      const responseRate = relevantAssignments.length > 0 ? Math.round((relevantResponses.length / relevantAssignments.length) * 100) : 100;
      const allMembers = await base44.entities.Member.filter({ active: true });
      return {
        totalActions: relevantActions.length, responseRate,
        unresponded: unrespondedAssignments.length,
        unrespondedMembers: new Set(unrespondedAssignments.map(a => a.member_id)).size,
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
    { label: 'Closing in 7 Days', value: stats.closingSoon, color: stats.closingSoon > 0 ? '#f59e0b' : 'rgba(26,26,46,0.35)', bg: stats.closingSoon > 0 ? 'rgba(245,158,11,0.07)' : 'rgba(26,26,46,0.03)', drilldownType: 'closingSoon' },
    { label: 'Attendance', value: stats.attendanceActions, color: '#6366f1', bg: 'rgba(99,102,241,0.07)', drilldownType: 'attendanceActions' },
    { label: 'Consent', value: stats.consentActions, color: '#14b8a6', bg: 'rgba(20,184,166,0.07)', drilldownType: 'consentActions' },
    { label: 'Volunteer', value: stats.volunteerActions, color: '#ec4899', bg: 'rgba(236,72,153,0.07)', drilldownType: 'volunteerActions' },
  ];

  return (
    <>
      <div style={glassCard}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'rgba(116,19,220,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#7413dc" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '16px', color: '#1a1a2e', margin: 0 }}>Actions Required</h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(26,26,46,0.4)', margin: '2px 0 0' }}>Active actions for upcoming meetings & events · click a card for details</p>
          </div>
        </div>
        <div style={{ padding: '14px 24px 20px' }}>
          {stats.totalActions === 0 ? (
            <p style={{ color: 'rgba(26,26,46,0.4)', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>No active actions for upcoming sessions</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {statCards.map(stat => (
                <button key={stat.label}
                  onClick={() => stat.drilldownType ? setDrilldown(stat.drilldownType) : null}
                  style={{ background: stat.bg, borderRadius: '14px', padding: '14px 10px', textAlign: 'center', border: 'none', cursor: stat.drilldownType ? 'pointer' : 'default', transition: 'transform 0.15s ease', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (stat.drilldownType) e.currentTarget.style.transform = 'scale(1.04)'; }}
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
}

// ── Quick action tiles config ──────────────────────────────────────────────────
const getQuickActions = (user) => [
  { icon: Users, label: 'Members', accent: '#3b82f6', dropdown: [{ label: 'Member Details', page: 'LeaderMembers', icon: Users }, { label: 'Attendance', page: 'LeaderAttendance', icon: UserCheck }, { label: 'Parent Portal', page: 'ParentPortal', icon: Users }] },
  { icon: Calendar, label: 'Programme', accent: '#7413dc', dropdown: [{ label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar }, { label: 'Events', page: 'LeaderEvents', icon: CalendarDays }, { label: 'Ideas Board', page: 'IdeasBoard', icon: Lightbulb }] },
  { icon: ShieldAlert, label: 'Safety', accent: '#f97316', dropdown: [{ label: 'Risk Assessments', page: 'RiskAssessments', icon: ShieldAlert }, { label: 'Consent Forms', page: 'ConsentForms', icon: FileText }] },
  { icon: Award, label: 'Badges', accent: '#22c55e', dropdown: [{ label: 'Badge Tracking', page: 'LeaderBadges', icon: Award }, { label: 'Due Badges', page: 'AwardBadges', icon: TrendingUp }, { label: 'Badge Stock', page: 'BadgeStockManagement', icon: Package }, ...(user?.role === 'admin' ? [{ label: 'Manage Badges', page: 'ManageBadges', icon: Settings, separator: true }] : [])] },
  { icon: BookOpen, label: 'Section Admin', accent: '#14b8a6', dropdown: [{ label: 'Communications', page: 'Communications', icon: Mail }, { label: 'Section Accounting', page: 'SectionAccounting', icon: Landmark }, ...(['admin', 'treasurer', 'glv', 'team_leader'].includes(user?.role) ? [{ label: 'Treasurer Portal', page: 'TreasurerDashboard', icon: Landmark, separator: true }] : [])] },
  { icon: Image, label: 'Gallery', accent: '#ec4899', page: 'LeaderGallery' },
];

// ── Inner dashboard (consumes SectionContext) ──────────────────────────────────
function LeaderDashboardInner() {
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

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7ff' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(116,19,220,0.15)', borderTopColor: '#7413dc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const actions = getQuickActions(user);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f7ff 0%, #f0eeff 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <FloatingNav />

      {/* ── Hero header — light ── */}
      <div style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(116,19,220,0.1)',
        padding: '32px 40px 28px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Top row: greeting + section selector */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', marginBottom: '6px', margin: '0 0 6px' }}>Leader Portal</p>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 36px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.15 }}>
                Welcome back, {user.display_name || user.full_name?.split(' ')[0]}
              </h1>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>40th Rochdale (Syke) Scouts</p>
            </div>
            <InlineSectionSelector />
          </div>

          {/* This week's meeting in the hero */}
          <ThisWeeksMeeting sections={sections} selectedSection={selectedSection} />
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 40px 0' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,46,0.35)', marginBottom: '14px' }}>Quick access</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {actions.map(action => (
            action.dropdown ? (
              <DropdownMenu key={action.label}>
                <DropdownMenuTrigger asChild>
                  <button style={{
                    background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                    border: `1px solid ${action.accent}20`, borderRadius: '18px',
                    padding: '18px 10px', cursor: 'pointer', textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${action.accent}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
                  >
                    <div style={{ width: '42px', height: '42px', background: `${action.accent}18`, borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <action.icon size={20} color={action.accent} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px', color: '#1a1a2e' }}>{action.label}</span>
                      <ChevronDown size={11} color="rgba(26,26,46,0.4)" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {action.dropdown.map(sub => (
                    <React.Fragment key={sub.page}>
                      {sub.separator && <DropdownMenuSeparator />}
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(sub.page)} className="flex items-center gap-2 cursor-pointer">
                          <sub.icon className="w-4 h-4" /> {sub.label}
                        </Link>
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link key={action.label} to={createPageUrl(action.page)} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                  border: `1px solid ${action.accent}20`, borderRadius: '18px',
                  padding: '18px 10px', cursor: 'pointer', textAlign: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${action.accent}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ width: '42px', height: '42px', background: `${action.accent}18`, borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <action.icon size={20} color={action.accent} />
                  </div>
                  <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: '12px', color: '#1a1a2e' }}>{action.label}</span>
                </div>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* ── Dashboard content ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 40px 48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <BadgesDue sections={sections} selectedSection={selectedSection} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <UpcomingMeetings sections={sections} selectedSection={selectedSection} />
          <UpcomingEvents sections={sections} selectedSection={selectedSection} />
        </div>

        <ActionsStatus sections={sections} selectedSection={selectedSection} />

        {/* Receipt upload CTA */}
        <div style={{
          background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(116,19,220,0.1)',
          borderRadius: '20px', padding: '22px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(116,19,220,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={18} color="#7413dc" />
            </div>
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '15px', color: '#1a1a2e', margin: 0 }}>Upload Receipts</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.45)', margin: '2px 0 0' }}>Submit your expenses for reimbursement</p>
            </div>
          </div>
          <Link to={createPageUrl('ReceiptUploader')} style={{
            fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
            color: '#fff', background: '#7413dc', textDecoration: 'none',
            borderRadius: '25px', padding: '9px 22px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Receipt size={14} /> Upload Receipt
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page (provides SectionContext) ────────────────────────────────────────
export default function LeaderDashboard() {
  return (
    <SectionProvider>
      <LeaderDashboardInner />
    </SectionProvider>
  );
}