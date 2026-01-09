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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Events & Camps</h1>
              <p className="mt-2 text-white/80">View upcoming and past events</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-white text-[#7413dc]' : 'bg-white/10 text-white border-white hover:bg-white/20'}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'outline'}
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-white text-[#7413dc]' : 'bg-white/10 text-white border-white hover:bg-white/20'}
              >
                <CalendarViewIcon className="w-4 h-4 mr-2" />
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No events planned at the moment</p>
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
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
                <div className="grid gap-4">
                  {upcomingEvents.map(event => {
                    const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
                    
                    return (
                      <Card
                        key={event.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => navigate(createPageUrl('ParentEventDetail') + `?id=${event.id}`)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{event.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  {format(new Date(event.start_date), 'EEEE, MMMM d, yyyy')}
                                  {event.end_date && event.end_date !== event.start_date && (
                                    <> to {format(new Date(event.end_date), 'EEEE, MMMM d, yyyy')}</>
                                  )}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize">{event.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {event.description && (
                            <p className="text-gray-700 line-clamp-2">{event.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-sm">
                            {eventSections.map(section => (
                              <Badge key={section.id} variant="outline">{section.display_name}</Badge>
                            ))}
                          </div>

                          {(event.cost > 0 || event.consent_deadline || event.payment_deadline) && (
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                              {event.cost > 0 && (
                                <div>
                                  <p className="text-xs text-gray-600">Cost</p>
                                  <p className="font-medium">£{event.cost.toFixed(2)}</p>
                                </div>
                              )}
                              {event.consent_deadline && (
                                <div>
                                  <p className="text-xs text-gray-600">Consent Deadline</p>
                                  <p className="font-medium">{format(new Date(event.consent_deadline), 'MMM d, yyyy')}</p>
                                </div>
                              )}
                              {event.payment_deadline && (
                                <div>
                                  <p className="text-xs text-gray-600">Payment Deadline</p>
                                  <p className="font-medium">{format(new Date(event.payment_deadline), 'MMM d, yyyy')}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Past Events</h2>
                <div className="grid gap-4">
                  {pastEvents.map(event => {
                    const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
                    
                    return (
                      <Card key={event.id} className="opacity-75">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{event.title}</CardTitle>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span>{format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                                {event.location && <span>• {event.location}</span>}
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize">{event.type}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {eventSections.map(section => (
                              <Badge key={section.id} variant="outline">{section.display_name}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
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