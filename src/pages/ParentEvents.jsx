import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, MapPin, List, Calendar as CalendarViewIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';

export default function ParentEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    const kids = await base44.entities.Member.filter({
      parent_one_email: currentUser.email,
    });
    const kids2 = await base44.entities.Member.filter({
      parent_two_email: currentUser.email,
    });
    setChildren([...kids, ...kids2]);
  };

  const childSectionIds = [...new Set(children.map(c => c.section_id).filter(Boolean))];

  const { data: events = [] } = useQuery({
    queryKey: ['events', childSectionIds],
    queryFn: async () => {
      if (childSectionIds.length === 0) return [];
      const allEvents = await base44.entities.Event.filter({ published: true });
      return allEvents
        .filter(e => e.section_ids?.some(sid => childSectionIds.includes(sid)))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: childSectionIds.length > 0,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

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

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(new Date(event.start_date), day));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CalendarIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Events & Camps</h1>
                <p className="text-gray-600 text-lg mt-1">Adventures await!</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-[#7413dc] hover:bg-[#5c0fb0]' : ''}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-[#7413dc] hover:bg-[#5c0fb0]' : ''}
              >
                <CalendarViewIcon className="w-4 h-4 mr-2" />
                Calendar
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
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                >
                  Previous
                </Button>
                <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                >
                  Next
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[100px]" />
                ))}
                {daysInMonth.map(day => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[100px] p-2 border rounded-lg ${
                        !isSameMonth(day, currentMonth) ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                      <div className="space-y-1">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            onClick={() => navigate(createPageUrl('ParentEventDetail') + `?id=${event.id}`)}
                            className="text-xs p-1 bg-[#7413dc] text-white rounded cursor-pointer hover:bg-[#5c0fb0] truncate"
                          >
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
                    const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                      <Card
                        className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-l-4 border-l-[#7413dc] bg-white/80 backdrop-blur-sm"
                        onClick={() => navigate(createPageUrl('ParentEventDetail') + `?id=${event.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge className={event.type === 'Camp' ? 'bg-green-600' : event.type === 'Day Event' ? 'bg-blue-600' : 'bg-gray-600'}>
                                  {event.type}
                                </Badge>
                              </div>
                              <CardTitle className="text-2xl mb-3">{event.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4 text-[#7413dc]" />
                                  <span className="font-medium">{format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                                  {event.end_date && event.end_date !== event.start_date && (
                                    <span className="text-gray-400">→ {format(new Date(event.end_date), 'MMM d')}</span>
                                  )}
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {event.description && (
                            <p className="text-gray-700 line-clamp-2">{event.description}</p>
                          )}

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
                  {pastEvents.map((event, index) => {
                    const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
                    
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
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
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}