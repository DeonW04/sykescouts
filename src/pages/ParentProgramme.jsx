import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Award, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { motion } from 'framer-motion';
import InlinePayment from '../components/mobile/InlinePayment';

const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

export default function ParentProgramme() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [payOpen, setPayOpen] = useState({}); // keyed by programme.id

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    const kids = await base44.entities.Member.filter({ parent_one_email: currentUser.email });
    const kids2 = await base44.entities.Member.filter({ parent_two_email: currentUser.email });
    setChildren([...kids, ...kids2]);
  };

  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];
  const childIds = children.map(c => c.id);
  const child = children[0];

  const { data: terms = [] } = useQuery({
    queryKey: ['terms', childSectionIds],
    queryFn: () => base44.entities.Term.filter({ active: true }),
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.filter({ published: true }),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: badgeCriteria = [] } = useQuery({
    queryKey: ['badge-criteria'],
    queryFn: () => base44.entities.ProgrammeBadgeCriteria.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  // Payment queries
  const { data: meetingPaymentStatuses = [], refetch: refetchPaymentStatuses } = useQuery({
    queryKey: ['meeting-payment-statuses-portal', childIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.MeetingPaymentStatus.filter({});
      return all.filter(ps => childIds.includes(ps.member_id));
    },
    enabled: childIds.length > 0,
  });

  const { data: paymentOverrides = [] } = useQuery({
    queryKey: ['meeting-payment-overrides-portal', childIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.MeetingPaymentOverride.filter({});
      return all.filter(o => childIds.includes(o.member_id) && o.programme_id);
    },
    enabled: childIds.length > 0,
  });

  const { data: attendanceActions = [] } = useQuery({
    queryKey: ['meeting-attendance-actions-portal'],
    queryFn: () => base44.entities.ActionRequired.filter({ action_purpose: 'attendance' }),
    enabled: childIds.length > 0,
    select: data => data.filter(a => a.programme_id),
  });

  const { data: attendanceResponses = [] } = useQuery({
    queryKey: ['meeting-attendance-responses-portal', childIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.ActionResponse.filter({});
      return all.filter(r => childIds.includes(r.member_id) || childIds.includes(r.child_member_id));
    },
    enabled: childIds.length > 0,
  });

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

  const now = new Date();
  const relevantTerms = terms.filter(t => childSectionIds.includes(t.section_id));
  const currentTerm = relevantTerms.find(t => now >= new Date(t.start_date) && now <= new Date(t.end_date))
    || relevantTerms.filter(t => new Date(t.start_date) > now).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

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
    const criteria = badgeCriteria.filter(c => c.programme_id === prog.id);
    criteria.forEach(c => {
      const badge = badges.find(b => b.id === c.badge_id);
      if (badge) {
        if (!programmeBadges[badge.id]) programmeBadges[badge.id] = { badge, requirements: [] };
        (c.requirement_ids || []).forEach(reqId => {
          const req = requirements.find(r => r.id === reqId);
          if (req && !programmeBadges[badge.id].requirements.find(r => r.id === reqId)) programmeBadges[badge.id].requirements.push(req);
        });
      }
    });
  });

  const renderPaymentRow = (prog) => {
    const payState = getMeetingPaymentState(prog);
    if (!payState) return null;
    const ps = getMeetingPayStatus(prog.id);

    if (payState === 'waived') {
      return <div className="mt-3 pt-3 border-t"><Badge variant="outline" className="text-gray-500">Waived</Badge></div>;
    }
    if (payState === 'paid') {
      return (
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid — £{prog.cost?.toFixed(2)}</Badge>
            {ps?.paid_at && <span className="text-xs text-gray-500">{format(new Date(ps.paid_at), 'd MMM yyyy')}</span>}
            {ps?.card_brand && ps?.card_last4 && <span className="text-xs text-gray-500 capitalize">{ps.card_brand} ···· {ps.card_last4}</span>}
          </div>
        </div>
      );
    }
    // Unpaid
    return (
      <div className="mt-3 pt-3 border-t">
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

  const renderBadges = (prog) => {
    const progBadges = badgeCriteria.filter(c => c.programme_id === prog.id).map(c => badges.find(b => b.id === c.badge_id)).filter(Boolean);
    if (!progBadges.length) return null;
    return (
      <div className="mt-5 pt-5 border-t">
        <p className="text-sm font-semibold text-gray-700 mb-3">Badge Work:</p>
        <div className="flex flex-wrap gap-3">
          {progBadges.map(badge => (
            <div key={badge.id} className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full">
              <img src={badge.image_url} alt={badge.name} className="w-6 h-6 rounded" />
              <span className="text-sm font-medium text-gray-800">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
        <div className="bg-[#7413dc] text-white py-8"><div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"><h1 className="text-3xl font-bold">Term Programme</h1></div></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card><CardContent className="p-12 text-center"><Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">No upcoming term at the moment</p></CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <FloatingNav />
      <NavBarSpacer />
      <div className="relative bg-gradient-to-br from-green-600 to-[#004851] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-4xl font-bold">Weekly Programme</h1>
            {new Date(currentTerm.start_date) > now && <span className="bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-full">Upcoming Term</span>}
          </div>
          <p className="text-green-100 text-lg">{currentTerm.title} • {format(new Date(currentTerm.start_date), 'MMM d')} - {format(new Date(currentTerm.end_date), 'MMM d, yyyy')}</p>
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
              <Card className="shadow-xl border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-white">
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {format(new Date(nextMeeting.date), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd') && <Badge className="bg-green-600">Today</Badge>}
                      {nextMeeting.has_cost && nextMeeting.cost > 0 && getMeetingPaymentState(nextMeeting) === 'paid' && <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</Badge>}
                      {nextMeeting.has_cost && nextMeeting.cost > 0 && getMeetingPaymentState(nextMeeting) === 'unpaid' && <Badge className="bg-amber-500">Payment required</Badge>}
                    </div>
                    <CardTitle className="text-2xl">{nextMeeting.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2 text-gray-600"><Calendar className="w-4 h-4" /><span className="font-medium">{format(new Date(nextMeeting.date), 'EEEE, MMMM d')}</span></div>
                  </div>
                </CardHeader>
                {(nextMeeting.shown_in_portal && nextMeeting.description) && (
                  <CardContent>
                    <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{nextMeeting.description}</p>
                    {renderBadges(nextMeeting)}
                    {renderPaymentRow(nextMeeting)}
                  </CardContent>
                )}
                {!(nextMeeting.shown_in_portal && nextMeeting.description) && renderPaymentRow(nextMeeting) && (
                  <CardContent>{renderPaymentRow(nextMeeting)}</CardContent>
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
                  <Card className="shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-2xl">{prog.title}</CardTitle>
                          {prog.has_cost && prog.cost > 0 && getMeetingPaymentState(prog) === 'paid' && <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</Badge>}
                          {prog.has_cost && prog.cost > 0 && getMeetingPaymentState(prog) === 'unpaid' && <Badge className="bg-amber-500">Payment required</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-gray-600"><Calendar className="w-4 h-4" /><span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span></div>
                      </div>
                    </CardHeader>
                    {(prog.shown_in_portal && prog.description) && (
                      <CardContent>
                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{prog.description}</p>
                        {renderBadges(prog)}
                        {renderPaymentRow(prog)}
                      </CardContent>
                    )}
                    {!(prog.shown_in_portal && prog.description) && getMeetingPaymentState(prog) && (
                      <CardContent>{renderPaymentRow(prog)}</CardContent>
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
                  <Card className="shadow-lg bg-gray-50/80 backdrop-blur-sm border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-xl text-gray-700">{prog.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-gray-500"><Calendar className="w-4 h-4" /><span className="font-medium">{format(new Date(prog.date), 'EEEE, MMMM d')}</span></div>
                    </CardHeader>
                    {prog.shown_in_portal && prog.description && (
                      <CardContent>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{prog.description}</p>
                        {renderBadges(prog)}
                      </CardContent>
                    )}
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
    </div>
  );
}