import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, MapPin, Users, ChevronRight, FileText, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import NewEventDialog from '../components/events/NewEventDialog';
import { motion } from 'framer-motion';
import LeaderNav from '../components/leader/LeaderNav';

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = events.filter(e => {
    const endDate = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
    endDate.setHours(23, 59, 59, 999);
    return endDate >= today;
  });
  
  const pastEvents = events.filter(e => {
    const endDate = e.end_date ? new Date(e.end_date) : new Date(e.start_date);
    endDate.setHours(23, 59, 59, 999);
    return endDate < today;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <LeaderNav />
      <div className="relative bg-gradient-to-br from-[#7413dc] to-[#004851] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-bold">Events & Camps</h1>
              </div>
              <p className="text-purple-100 text-lg">Plan and manage your upcoming adventures</p>
            </div>
            <Button
              onClick={() => {
                setEditingEvent(null);
                setShowNewDialog(true);
              }}
              size="lg"
              className="bg-white text-[#7413dc] hover:bg-purple-50 font-semibold shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-[#7413dc] border-t-transparent rounded-full mb-4" />
            <p className="text-gray-600 font-medium">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-dashed border-2 border-gray-300 bg-white/50 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-[#7413dc]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Events Yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Start planning your next adventure by creating your first event or camp.</p>
                <Button 
                  onClick={() => setShowNewDialog(true)} 
                  size="lg"
                  className="bg-gradient-to-r from-[#7413dc] to-[#5c0fb0] hover:from-[#5c0fb0] hover:to-[#7413dc] shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Event
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {upcomingEvents.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-[#7413dc] to-transparent rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-900">Upcoming</h2>
                  <Badge className="bg-[#7413dc]">{upcomingEvents.length}</Badge>
                </div>
                <div className="grid gap-5">
                  {upcomingEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-l-4 border-l-[#7413dc] bg-white/80 backdrop-blur-sm overflow-hidden"
                        onClick={() => navigate(createPageUrl('EventDetail') + `?id=${event.id}`)}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-transparent rounded-bl-full"></div>
                        <CardHeader className="relative">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <Badge className={event.type === 'Camp' ? 'bg-green-600' : event.type === 'Day Event' ? 'bg-blue-600' : 'bg-gray-600'}>
                                  {event.type}
                                </Badge>
                                {event.published ? (
                                  <Badge className="bg-emerald-600 gap-1">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                    Published
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-2xl mb-3 group-hover:text-[#7413dc] transition-colors">{event.title}</CardTitle>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[#7413dc]" />
                                  <span className="font-medium">{format(new Date(event.start_date), 'EEE, MMM d, yyyy')}</span>
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
                              {event.description && (
                                <p className="text-gray-600 text-sm mt-3 line-clamp-2">{event.description}</p>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#7413dc] group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                          </div>
                        </CardHeader>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {pastEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-gray-400 to-transparent rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-900">Past Events</h2>
                  <Badge variant="outline">{pastEvents.length}</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {pastEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full bg-white/60 backdrop-blur-sm">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="mb-2 capitalize">{event.type}</Badge>
                              <CardTitle className="text-lg mb-2 line-clamp-1">
                                {event.title}
                              </CardTitle>
                              <div className="flex flex-col gap-1.5 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{format(new Date(event.start_date), 'MMM d, yyyy')}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(createPageUrl('EventDetail') + `?id=${event.id}`)}
                                className="whitespace-nowrap"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(createPageUrl('Gallery') + `?view=${event.type === 'Camp' ? 'camp' : 'event'}&id=${event.id}`)}
                                className="whitespace-nowrap"
                              >
                                <Image className="w-3.5 h-3.5 mr-1.5" />
                                Gallery
                              </Button>
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