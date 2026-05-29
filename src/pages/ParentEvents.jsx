import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, MapPin, List, Calendar as CalendarViewIcon, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import ParentNav from '../components/parent/ParentNav';
import InlinePayment from '../components/mobile/InlinePayment';

const ATTENDING_VALUES = new Set(['yes', 'yes, attending', 'attending']);

export default function ParentEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [payOpen, setPayOpen] = useState({}); // keyed by event.id

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

  const { data: events = [] } = useQuery({
    queryKey: ['events', childSectionIds],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ published: true });
      return allEvents.filter(e => e.section_ids?.some(sid => childSectionIds.includes(sid))).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  // Payment queries
  const { data: paymentStatuses = [], refetch: refetchPaymentStatuses } = useQuery({
    queryKey: ['event-payment-statuses-portal', childIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.EventPaymentStatus.filter({});
      return all.filter(ps => childIds.includes(ps.member_id));
    },
    enabled: childIds.length > 0,
  });

  const { data: paymentOverrides = [] } = useQuery({
    queryKey: ['event-payment-overrides-portal', childIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.MeetingPaymentOverride.filter({});
      return all.filter(o => childIds.includes(o.member_id) && o.event_id);
    },
    enabled: childIds.length > 0,
  });

  const { data: attendanceData = { actions: [], responses: [] } } = useQuery({
    queryKey: ['event-attendance-portal', events.map(e => e.id).join(','), childIds.join(',')],
    queryFn: async () => {
      const costEvents = events.filter(e => (e.cost || 0) > 0);
      if (!costEvents.length) return { actions: [], responses: [] };
      const allActions = await base44.entities.ActionRequired.filter({});
      const relevantActions = allActions.filter(a => a.action_purpose === 'attendance' && costEvents.some(e => e.id === a.event_id));
      if (!relevantActions.length) return { actions: relevantActions, responses: [] };
      const allResponses = await base44.entities.ActionResponse.filter({});
      const relevantResponses = allResponses.filter(r =>
        relevantActions.some(a => a.id === r.action_required_id) &&
        (childIds.includes(r.member_id) || childIds.includes(r.child_member_id))
      );
      return { actions: relevantActions, responses: relevantResponses };
    },
    enabled: events.length > 0 && childIds.length > 0,
  });

  // Payment helpers
  const getPaymentStatus = (eventId) => paymentStatuses.find(ps => ps.event_id === eventId && childIds.includes(ps.member_id));
  const getOverride = (eventId) => paymentOverrides.find(o => o.event_id === eventId && childIds.includes(o.member_id));
  const isAttending = (eventId) => {
    const action = attendanceData.actions.find(a => a.event_id === eventId);
    if (!action) return false;
    const resp = attendanceData.responses.find(r =>
      r.action_required_id === action.id &&
      (childIds.includes(r.member_id) || childIds.includes(r.child_member_id))
    );
    return !!(resp && ATTENDING_VALUES.has((resp.response_value || resp.response || '').toLowerCase()));
  };
  const invalidatePayments = () => refetchPaymentStatuses();

  const getPaymentState = (event) => {
    if (!(event.cost > 0)) return null;
    const override = getOverride(event.id);
    if (override?.override_type === 'waived') return 'waived';
    const ps = getPaymentStatus(event.id);
    if (ps?.status === 'paid') return 'paid';
    if (!isAttending(event.id)) return null;
    return 'unpaid';
  };

  if (!user || children.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_date) >= now);
  const pastEvents = events.filter(e => new Date(e.start_date) < now);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day) => events.filter(event => {
    const eventStart = new Date(event.start_date);
    const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;
    const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });

  const renderPaymentSection = (event) => {
    const payState = getPaymentState(event);
    if (!payState) return null;

    const ps = getPaymentStatus(event.id);

    if (payState === 'waived') {
      return (
        <div className="px-6 pb-4" onClick={e => e.stopPropagation()}>
          <Badge variant="outline" className="text-gray-500 border-gray-300">Waived</Badge>
        </div>
      );
    }

    if (payState === 'paid') {
      return (
        <div className="px-6 pb-4 pt-2 border-t border-green-100 bg-green-50/30" onClick={e => e.stopPropagation()}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</Badge>
            {ps?.paid_at && <span className="text-xs text-gray-500">Paid {format(new Date(ps.paid_at), 'd MMM yyyy')}</span>}
            {ps?.card_brand && ps?.card_last4 && <span className="text-xs text-gray-500 capitalize">{ps.card_brand} ···· {ps.card_last4}</span>}
          </div>
        </div>
      );
    }

    // Unpaid
    return (
      <div className="px-6 pb-4 pt-3 border-t border-amber-100 bg-amber-50/30" onClick={e => e.stopPropagation()}>
        {!payOpen[event.id] ? (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => setPayOpen(prev => ({ ...prev, [event.id]: true }))}
          >
            Pay £{event.cost.toFixed(2)}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">{event.title} — <span className="text-[#7413dc]">£{event.cost.toFixed(2)}</span></p>
              <Button size="sm" variant="ghost" onClick={() => setPayOpen(prev => ({ ...prev, [event.id]: false }))}>Cancel</Button>
            </div>
            <InlinePayment
              type="event"
              id={event.id}
              cost={Math.round(event.cost * 100)}
              memberId={child?.id}
              paymentMethods={child?.stripe_payment_methods || []}
              onSuccess={() => { setPayOpen(prev => ({ ...prev, [event.id]: false })); invalidatePayments(); }}
              onCancel={() => setPayOpen(prev => ({ ...prev, [event.id]: false }))}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <ParentNav />
      <div className="relative bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Events &amp; Camps</h1>
              <p className="text-purple-100 text-lg">Adventures await!</p>
            </div>
            <div className="flex gap-2">
              <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-white text-[#7413dc] font-semibold' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}>
                <List className="w-4 h-4 mr-2" />List
              </Button>
              <Button variant={viewMode === 'calendar' ? 'secondary' : 'outline'} onClick={() => setViewMode('calendar')} className={viewMode === 'calendar' ? 'bg-white text-[#7413dc] font-semibold' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'}>
                <CalendarViewIcon className="w-4 h-4 mr-2" />Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {events.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CalendarIcon className="w-10 h-10 text-[#7413dc]" />
              </div>
              <p className="text-gray-600 text-lg">No events planned at the moment</p>
            </CardContent>
          </Card>
        ) : viewMode === 'calendar' ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>Previous</Button>
                <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <Button variant="outline" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>Next</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">{day}</div>
                ))}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px]" />)}
                {daysInMonth.map(day => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div key={day.toISOString()} className={`min-h-[100px] p-2 border rounded-lg ${!isSameMonth(day, currentMonth) ? 'bg-gray-50' : 'bg-white'}`}>
                      <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <div key={event.id} onClick={() => navigate(createPageUrl('ParentEventDetail') + `?id=${event.id}`)} className="text-xs p-1 bg-[#7413dc] text-white rounded cursor-pointer hover:bg-[#5c0fb0] truncate">
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-[#7413dc] to-transparent rounded-full"></div>
                  <h2 className="text-2xl font-bold">Upcoming</h2>
                  <Badge className="bg-[#7413dc]">{upcomingEvents.length}</Badge>
                </div>
                <div className="grid gap-5">
                  {upcomingEvents.map((event, index) => {
                    const payState = getPaymentState(event);
                    return (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                        <Card className="hover:shadow-2xl transition-all duration-300 border-l-4 border-l-[#7413dc] bg-white/80 backdrop-blur-sm overflow-hidden">
                          {/* Clickable area navigates to detail */}
                          <div className="cursor-pointer" onClick={() => navigate(createPageUrl('ParentEventDetail') + `?id=${event.id}`)}>
                            <CardHeader>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <Badge className={event.type === 'Camp' ? 'bg-green-600' : event.type === 'Day Event' ? 'bg-blue-600' : 'bg-gray-600'}>{event.type}</Badge>
                                    {payState === 'paid' && <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</Badge>}
                                    {payState === 'waived' && <Badge variant="outline" className="text-gray-500">Waived</Badge>}
                                    {payState === 'unpaid' && <Badge className="bg-amber-500">Payment required</Badge>}
                                  </div>
                                  <CardTitle className="text-2xl mb-3">{event.title}</CardTitle>
                                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                      <CalendarIcon className="w-4 h-4 text-[#7413dc]" />
                                      <span className="font-medium">{format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                                      {event.end_date && event.end_date !== event.start_date && <span className="text-gray-400">→ {format(new Date(event.end_date), 'MMM d')}</span>}
                                    </div>
                                    {event.meeting_time && <span>Meet: {event.meeting_time}</span>}
                                    {event.pickup_time && <span>Pickup: {event.pickup_time}</span>}
                                    {event.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{event.location}</span></div>}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                              {event.description && <p className="text-gray-700 line-clamp-2 mb-3">{event.description}</p>}
                              {(event.cost > 0 || event.consent_deadline || event.payment_deadline) && (
                                <div className="flex flex-wrap gap-4 pt-3 border-t">
                                  {event.cost > 0 && (
                                    <div className="flex-1 min-w-[120px]">
                                      <p className="text-xs text-gray-500 mb-1">Cost</p>
                                      <p className="font-bold text-lg text-[#7413dc]">£{event.cost.toFixed(2)}</p>
                                    </div>
                                  )}
                                  {event.consent_deadline && (
                                    <div className="flex-1 min-w-[120px]">
                                      <p className="text-xs text-gray-500 mb-1">Consent By</p>
                                      <p className="font-medium text-sm">{format(new Date(event.consent_deadline), 'MMM d')}</p>
                                    </div>
                                  )}
                                  {event.payment_deadline && (
                                    <div className="flex-1 min-w-[120px]">
                                      <p className="text-xs text-gray-500 mb-1">Payment By</p>
                                      <p className="font-medium text-sm">{format(new Date(event.payment_deadline), 'MMM d')}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </div>
                          {/* Payment section — stops propagation */}
                          {renderPaymentSection(event)}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-gray-400 to-transparent rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-700">Past Events</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {pastEvents.map((event, index) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                      <Card className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(createPageUrl('ParentEventDetail') + `?id=${event.id}`)}>
                        <CardHeader>
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-2">{event.type}</Badge>
                              <CardTitle className="text-lg text-gray-700">{event.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>{format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}