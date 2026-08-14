import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Award, CheckCircle, Share2, HandHeart } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { motion } from 'framer-motion';
import InlinePayment from '../components/mobile/InlinePayment';
import MeetingDetailDialog from '@/components/parent/MeetingDetailDialog';
import { useSelectedChildId } from '@/hooks/useSelectedChild';

const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

export default function ParentProgramme() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [payOpen, setPayOpen] = useState({}); // keyed by programme.id
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mid = params.get('meetingId');
    if (mid) {
      setSelectedMeetingId(mid);
      if (params.get('pay') === '1') setPayOpen(prev => ({ ...prev, [mid]: true }));
    }
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: portal, refetch: refetchPortal } = useQuery({
    queryKey: ['parent-portal', user?.email],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: !!user?.email,
  });

  const { data: reference } = useQuery({
    queryKey: ['parent-reference', user?.email],
    queryFn: async () => (await base44.functions.invoke('getParentReferenceData', {})).data,
    enabled: !!user?.email,
  });

  const { data: allActionsRequired = [] } = useQuery({
    queryKey: ['all-actions-required'],
    queryFn: () => base44.entities.ActionRequired.filter({}),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => { if (portal?.children) setChildren(portal.children); }, [portal]);

  const [selectedChildId] = useSelectedChildId(children);
  const child = children.find(c => c.id === selectedChildId) || children[0];
  const childSectionIds = child?.section_id ? [child.section_id] : [];
  const childIds = child ? [child.id] : [];

  const terms = reference?.terms || [];
  const sections = portal?.sections || [];
  const childSection = sections.find(s => s.id === child?.section_id);
  const programmes = reference?.programmes || [];
  const badges = reference?.badges || [];
  const badgeCriteria = reference?.badgeCriteria || [];
  const requirements = reference?.badgeRequirements || [];
  const allResponses = portal?.actionResponses || [];

  const meetingPaymentStatuses = portal?.meetingPaymentStatuses || [];
  const paymentOverrides = (portal?.paymentOverrides || []).filter(o => o.programme_id);
  const attendanceActions = (reference?.attendanceActions || []).filter(a => a.programme_id);
  const attendanceResponses = portal?.actionResponses || [];
  const refetchPaymentStatuses = refetchPortal;

  // Payment helpers
  const getMeetingPayStatus = (progId) => meetingPaymentStatuses.find(ps => ps.meeting_id === progId && childIds.includes(ps.member_id));
  const getMeetingOverride = (progId) => paymentOverrides.find(o => o.programme_id === progId && childIds.includes(o.member_id));
  const isMeetingAttending = (progId) => {
    const action = attendanceActions.find(a => a.programme_id === progId);
    if (!action) return false;
    const resp = attendanceResponses.find(r =>
      r.action_required_id === action.id &&
      (childIds.includes(r.member_id) || childIds.includes(r.child_member_id))
    );
    return !!(resp && ATTENDING_VALUES.has((resp.response_value || resp.response || '').toLowerCase()));
  };
  const getMeetingPaymentState = (prog) => {
    if (!prog.has_cost || !(prog.cost > 0)) return null;
    const override = getMeetingOverride(prog.id);
    if (override?.override_type === 'waived') return 'waived';
    const ps = getMeetingPayStatus(prog.id);
    if (ps?.status === 'paid') return 'paid';
    if (!isMeetingAttending(prog.id)) return null;
    return 'unpaid';
  };

  // Volunteering is recorded as an ActionResponse to a 'volunteer'-purpose action —
  // matches what the leader side (LeaderRotaSection) reads, so both stay in sync.
  const isVolunteeredForProgramme = (progId) => {
    const volunteerAction = allActionsRequired.find(a => a.programme_id === progId && a.action_purpose === 'volunteer');
    if (!volunteerAction) return false;
    return allResponses.some(r =>
      r.action_required_id === volunteerAction.id &&
      childIds.includes(r.member_id || r.child_member_id) &&
      (r.response_value || r.response) === 'Yes, I will volunteer'
    );
  };

  const getBadgeGroupsForProgramme = (progId) => {
    const criteria = badgeCriteria.filter(c => c.programme_id === progId);
    const map = {};
    criteria.forEach(c => {
      const badge = badges.find(b => b.id === c.badge_id);
      if (!badge) return;
      if (!map[badge.id]) map[badge.id] = { badge, requirements: [] };
      (c.requirement_ids || []).forEach(reqId => {
        const req = requirements.find(r => r.id === reqId);
        if (req && !map[badge.id].requirements.find(r => r.id === reqId)) map[badge.id].requirements.push(req);
      });
    });
    return Object.values(map);
  };

  const getActionItemsForProgramme = (progId) => {
    const acts = allActionsRequired.filter(a => a.programme_id === progId && a.is_open !== false);
    return acts.map(action => {
      const resp = allResponses.find(r =>
        (r.action_required_id === action.id) &&
        (childIds.includes(r.member_id) || childIds.includes(r.child_member_id)) &&
        (r.response_value || r.response)
      );
      return { action, answered: !!resp, responseValue: resp?.response_value || resp?.response };
    });
  };

  const getMeetingLocationTime = (prog) => {
    const timeText = prog.optional_start_time
      ? `${prog.optional_start_time}${prog.optional_end_time ? ' – ' + prog.optional_end_time : ''}`
      : (childSection?.meeting_start_time ? `${childSection.meeting_start_time}${childSection.meeting_end_time ? ' – ' + childSection.meeting_end_time : ''}` : null);
    const locationText = prog.optional_location || null;
    return { timeText, locationText };
  };

  const handleShare = async (prog) => {
    const url = `${window.location.origin}${window.location.pathname}?meetingId=${prog.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: prog.title, url }); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const now = new Date();
  // Terms are group-wide (no section_id) — find current or next term from all active terms
  const currentTerm = terms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || terms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  const allTermProgrammes = currentTerm
    ? programmes.filter(p => {
        const d = new Date(p.date);
        return d >= new Date(currentTerm.start_date) && d <= new Date(currentTerm.end_date) && childSectionIds.includes(p.section_id);
      }).sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const upcomingAndFuture = allTermProgrammes.filter(p => { const d = new Date(p.date); d.setHours(0,0,0,0); return d >= startOfToday; });
  const nextMeeting = upcomingAndFuture.length > 0 ? upcomingAndFuture[0] : null;
  let showNextMeeting = false;
  if (nextMeeting) {
    const md = new Date(nextMeeting.date); md.setHours(23,59,59,999);
    showNextMeeting = now <= md;
  }
  const futureProgrammes = upcomingAndFuture.slice(1);
  const previousProgrammes = allTermProgrammes.filter(p => {
    const d = new Date(p.date); d.setHours(0,0,0,0);
    if (d < startOfToday) return true;
    if (!showNextMeeting && nextMeeting && p.id === nextMeeting.id) return true;
    return false;
  });

  const programmeBadges = {};
  allTermProgrammes.forEach(prog => {
    getBadgeGroupsForProgramme(prog.id).forEach(({ badge, requirements: reqs }) => {
      if (!programmeBadges[badge.id]) programmeBadges[badge.id] = { badge, requirements: [] };
      reqs.forEach(req => {
        if (!programmeBadges[badge.id].requirements.find(r => r.id === req.id)) programmeBadges[badge.id].requirements.push(req);
      });
    });
  });

  const renderPaymentRow = (prog) => {
    const payState = getMeetingPaymentState(prog);
    if (!payState) return <p className="text-sm text-gray-500">No payment needed for this meeting.</p>;
    const ps = getMeetingPayStatus(prog.id);

    if (payState === 'waived') {
      return <Badge variant="outline" className="text-gray-500">Waived</Badge>;
    }
    if (payState === 'paid') {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid — £{prog.cost?.toFixed(2)}</Badge>
          {ps?.paid_at && <span className="text-xs text-gray-500">{format(new Date(ps.paid_at), 'd MMM yyyy')}</span>}
          {ps?.card_brand && ps?.card_last4 && <span className="text-xs text-gray-500 capitalize">{ps.card_brand} ···· {ps.card_last4}</span>}
        </div>
      );
    }
    // Unpaid
    return (
      <div>
        {!payOpen[prog.id] ? (
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500">Payment required</Badge>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setPayOpen(prev => ({ ...prev, [prog.id]: true }))}>
              Pay £{prog.cost?.toFixed(2)}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">{prog.title} — <span className="text-[#7413dc]">£{prog.cost?.toFixed(2)}</span></p>
              <Button size="sm" variant="ghost" onClick={() => setPayOpen(prev => ({ ...prev, [prog.id]: false }))}>Cancel</Button>
            </div>
            <InlinePayment
              type="meeting"
              id={prog.id}
              cost={Math.round((prog.cost || 0) * 100)}
              memberId={child?.id}
              paymentMethods={child?.stripe_payment_methods || []}
              onSuccess={() => { setPayOpen(prev => ({ ...prev, [prog.id]: false })); refetchPaymentStatuses(); }}
              onCancel={() => setPayOpen(prev => ({ ...prev, [prog.id]: false }))}
            />
          </div>
        )}
      </div>
    );
  };

  const selectedProgramme = programmes.find(p => p.id === selectedMeetingId) || allTermProgrammes.find(p => p.id === selectedMeetingId);

  const meetingHeaderBadges = (prog) => (
    <>
      {prog.has_cost && prog.cost > 0 && getMeetingPaymentState(prog) === 'paid' && <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</Badge>}
      {prog.has_cost && prog.cost > 0 && getMeetingPaymentState(prog) === 'unpaid' && <Badge className="bg-amber-500">Payment required</Badge>}
      {isVolunteeredForProgramme(prog.id) && <Badge className="bg-green-100 text-green-700 border border-green-200 flex items-center gap-1"><HandHeart className="w-3 h-3" />Volunteering</Badge>}
    </>
  );

  if (!user || children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentTerm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FloatingNav />
        <NavBarSpacer />
        <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}><div className="max-w-5xl mx-auto"><p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Parent Portal</p><h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: 0 }}>Weekly Programme</h1></div></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card><CardContent className="p-12 text-center"><Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No upcoming term at the moment</p></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-5xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Parent Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Weekly Programme</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>{currentTerm.title} · {format(new Date(currentTerm.start_date), 'MMM d')} – {format(new Date(currentTerm.end_date), 'MMM d, yyyy')}{new Date(currentTerm.start_date) > now ? ' · Upcoming Term' : ''}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {Object.keys(programmeBadges).length > 0 && (
          <Card className="mb-8 shadow-xl bg-gradient-to-br from-yellow-50/50 to-white border-l-4 border-l-yellow-500">
            <CardHeader><CardTitle className="flex items-center gap-3 text-2xl"><Award className="w-7 h-7 text-yellow-600" />Badges This Term</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Object.values(programmeBadges).map(({ badge }) => (
                  <div key={badge.id} className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border-2 border-yellow-100 hover:shadow-md transition-shadow text-center">
                    <img src={badge.image_url} alt={badge.name} className="w-12 h-12 rounded-lg object-contain" />
                    <p className="font-semibold text-xs leading-tight">{badge.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Meeting */}
        {showNextMeeting && nextMeeting && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Next Meeting</h2>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card
                className="shadow-xl border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-white cursor-pointer hover:shadow-2xl transition-shadow"
                onClick={() => setSelectedMeetingId(nextMeeting.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {format(new Date(nextMeeting.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && <Badge className="bg-green-600">Today</Badge>}
                        {meetingHeaderBadges(nextMeeting)}
                      </div>
                      <CardTitle className="text-2xl">{nextMeeting.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-gray-600"><Calendar className="w-4 h-4" /><span className="font-medium">{format(new Date(nextMeeting.date), 'EEEE, MMMM d')}</span></div>
                    </div>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleShare(nextMeeting); }} className="flex-shrink-0">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                {nextMeeting.shown_in_portal && nextMeeting.description && (
                  <CardContent>
                    <p className="text-gray-700 text-lg leading-relaxed line-clamp-2">{nextMeeting.description}</p>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          </div>
        )}

        {/* Future Meetings */}
        {futureProgrammes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Upcoming Meetings</h2>
            <div className="space-y-4">
              {futureProgrammes.map((prog, index) => (
                <motion.div key={prog.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card
                    className="shadow-xl bg-white/80 backdrop-blur-sm cursor-pointer hover:shadow-2xl transition-shadow"
                    onClick={() => setSelectedMeetingId(prog.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <CardTitle className="text-2xl">{prog.title}</CardTitle>
                            {meetingHeaderBadges(prog)}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-gray-600"><Calendar className="w-4 h-4" /><span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span></div>
                        </div>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleShare(prog); }} className="flex-shrink-0">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {prog.shown_in_portal && prog.description && (
                      <CardContent>
                        <p className="text-gray-700 text-lg leading-relaxed line-clamp-2">{prog.description}</p>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Meetings */}
        {previousProgrammes.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Previous Meetings</h2>
            <div className="space-y-4">
              {previousProgrammes.reverse().map((prog, index) => (
                <motion.div key={prog.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card
                    className="shadow-lg bg-gray-50/80 backdrop-blur-sm border-gray-200 cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => setSelectedMeetingId(prog.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-xl text-gray-700">{prog.title}</CardTitle>
                            {isVolunteeredForProgramme(prog.id) && <Badge className="bg-green-100 text-green-700 border border-green-200 flex items-center gap-1"><HandHeart className="w-3 h-3" />Volunteered</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-gray-500"><Calendar className="w-4 h-4" /><span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span></div>
                        </div>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleShare(prog); }} className="flex-shrink-0">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {allTermProgrammes.length === 0 && (
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6"><Calendar className="w-10 h-10 text-green-600" /></div>
              <p className="text-gray-600 text-lg">No meetings planned yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedProgramme && (() => {
        const { timeText, locationText } = getMeetingLocationTime(selectedProgramme);
        return (
          <MeetingDetailDialog
            open={!!selectedMeetingId}
            onOpenChange={(v) => !v && setSelectedMeetingId(null)}
            programme={selectedProgramme}
            badgeGroups={getBadgeGroupsForProgramme(selectedProgramme.id)}
            volunteered={isVolunteeredForProgramme(selectedProgramme.id)}
            actionItems={getActionItemsForProgramme(selectedProgramme.id)}
            timeText={timeText}
            locationText={locationText}
            renderPayment={renderPaymentRow}
            onShare={() => handleShare(selectedProgramme)}
          />
        );
      })()}
    </div>
  );
}