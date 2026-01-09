import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import NewEventDialog from '../components/events/NewEventDialog';

export default function LeaderEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    if (currentUser.role === 'admin') {
      setIsLeader(true);
    } else {
      const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
      setIsLeader(leaders.length > 0);
    }
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', user],
    queryFn: async () => {
      if (!user) return [];
      
      if (user.role === 'admin') {
        return base44.entities.Section.filter({ active: true });
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: user.id });
        if (leaders.length === 0) return [];
        
        const leader = leaders[0];
        const allSections = await base44.entities.Section.filter({ active: true });
        return allSections.filter(s => leader.section_ids?.includes(s.id));
      }
    },
    enabled: !!user,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', sections],
    queryFn: async () => {
      if (sections.length === 0) return [];
      const sectionIds = sections.map(s => s.id);
      const allEvents = await base44.entities.Event.filter({});
      return allEvents
        .filter(e => e.section_ids?.some(sid => sectionIds.includes(sid)))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: sections.length > 0,
  });

  if (!user || !isLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600">Access denied. Leaders only.</p>
        </Card>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => new Date(e.start_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.start_date) < new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Events & Camps</h1>
                <p className="mt-1 text-white/80">Plan and manage events, camps, and trips</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setEditingEvent(null);
                setShowNewDialog(true);
              }}
              className="bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to get started.</p>
              <Button onClick={() => setShowNewDialog(true)} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
                <Plus className="w-4 h-4 mr-2" />
                Create First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
                <div className="grid gap-4">
                  {upcomingEvents.map(event => (
                    <Card 
                      key={event.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(createPageUrl('EventDetail') + `?id=${event.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{event.title}</CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy')}</span>
                              {event.end_date && event.end_date !== event.start_date && (
                                <span>to {format(new Date(event.end_date), 'EEE, MMM d, yyyy')}</span>
                              )}
                              {event.location && <span>• {event.location}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.published ? (
                              <Badge className="bg-green-600">Published</Badge>
                            ) : (
                              <Badge variant="outline">Draft</Badge>
                            )}
                            <Badge variant="outline" className="capitalize">{event.type}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {event.description && (
                        <CardContent>
                          <p className="text-gray-600 text-sm">{event.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Past Events</h2>
                <div className="grid gap-4">
                  {pastEvents.map(event => (
                    <Card 
                      key={event.id} 
                      className="opacity-75 hover:opacity-100 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate(createPageUrl('EventDetail') + `?id=${event.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl">{event.title}</CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>{format(new Date(event.start_date), 'EEE, MMM d, yyyy')}</span>
                              {event.end_date && event.end_date !== event.start_date && (
                                <span>to {format(new Date(event.end_date), 'EEE, MMM d, yyyy')}</span>
                              )}
                              {event.location && <span>• {event.location}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">{event.type}</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <NewEventDialog
        open={showNewDialog}
        onOpenChange={(open) => {
          setShowNewDialog(open);
          if (!open) setEditingEvent(null);
        }}
        sections={sections}
        editEvent={editingEvent}
      />
    </div>
  );
}