import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ParentEvents() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#7413dc] text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Events & Camps</h1>
          <p className="mt-2 text-white/80">View upcoming and past events</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No events planned at the moment</p>
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
                    const documents = event.documents || [];
                    
                    return (
                      <Card key={event.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{event.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
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
                            <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-2 text-sm">
                            {eventSections.map(section => (
                              <Badge key={section.id} variant="outline">{section.display_name}</Badge>
                            ))}
                          </div>

                          {(event.cost > 0 || event.consent_deadline || event.payment_deadline) && (
                            <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
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

                          {documents.length > 0 && (
                            <div className="pt-4 border-t">
                              <p className="text-sm font-medium text-gray-700 mb-2">Documents:</p>
                              <div className="space-y-2">
                                {documents.map((doc, idx) => (
                                  <a
                                    key={idx}
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm flex-1">{doc.name}</span>
                                    <Download className="w-4 h-4 text-gray-400" />
                                  </a>
                                ))}
                              </div>
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