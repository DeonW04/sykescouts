import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, ChevronRight, Sparkles, Clock, List } from 'lucide-react';
import NewTermDialog from '../components/programme/NewTermDialog';
import AllTermsDialog from '../components/programme/AllTermsDialog';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';

export default function LeaderProgramme() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [showNewTermDialog, setShowNewTermDialog] = useState(false);
  const [showAllTermsDialog, setShowAllTermsDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['terms', sections],
    queryFn: async () => {
      if (sections.length === 0) return [];
      const sectionIds = sections.map(s => s.id);
      const allTerms = await base44.entities.Term.filter({ active: true });
      return allTerms.filter(t => sectionIds.includes(t.section_id)).sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
      );
    },
    enabled: sections.length > 0,
  });

  // Determine current term
  const currentTerm = selectedTerm || terms.find(t => {
    const today = new Date();
    const start = new Date(t.start_date);
    const end = new Date(t.end_date);
    return today >= start && today <= end;
  }) || terms[0];

  const currentSection = sections.find(s => s.id === currentTerm?.section_id);

  // Get meetings for current term
  const { data: meetings = [] } = useQuery({
    queryKey: ['term-meetings', currentTerm?.id],
    queryFn: () => {
      if (!currentTerm) return [];
      const allMeetings = [];
      const start = new Date(currentTerm.start_date);
      const end = new Date(currentTerm.end_date);
      const halfTermStart = new Date(currentTerm.half_term_start);
      const halfTermEnd = new Date(currentTerm.half_term_end);

      const dayOfWeekMap = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      const targetDay = dayOfWeekMap[currentTerm.meeting_day];

      let current = new Date(start);
      while (current.getDay() !== targetDay) {
        current.setDate(current.getDate() + 1);
      }

      while (current <= end) {
        const isHalfTerm = current >= halfTermStart && current <= halfTermEnd;
        allMeetings.push({
          date: new Date(current),
          isHalfTerm,
        });
        current.setDate(current.getDate() + 7);
      }

      return allMeetings;
    },
    enabled: !!currentTerm,
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes', currentTerm?.section_id],
    queryFn: () => base44.entities.Programme.filter({ section_id: currentTerm.section_id }),
    enabled: !!currentTerm,
  });

  const handleMeetingClick = (meeting) => {
    if (meeting.isHalfTerm) return;
    const dateStr = meeting.date.toISOString().split('T')[0];
    navigate(createPageUrl('MeetingDetail') + `?section_id=${currentTerm.section_id}&date=${dateStr}&term_id=${currentTerm.id}`);
  };

  if (!user || !isLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600">Access denied. Leaders only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LeaderNav />
      <div className="relative bg-gradient-to-br from-[#004851] to-[#7413dc] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-bold">Programme Planning</h1>
              </div>
              <p className="text-blue-100 text-lg">Plan weekly meetings and track your section's progress</p>
            </div>
            <Button
              onClick={() => setShowAllTermsDialog(true)}
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 font-semibold"
            >
              <List className="w-5 h-5 mr-2" />
              Past & Future Terms
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Next Meeting Highlight */}
        {!isLoading && currentTerm && meetings.length > 0 && (() => {
          const nextMeeting = meetings.find(m => !m.isHalfTerm && m.date >= new Date());
          if (!nextMeeting) return null;
          
          const programme = programmes.find(p => p.date === nextMeeting.date.toISOString().split('T')[0]);
          
          return (
            <Card className="mb-8 shadow-xl border-l-4 border-l-green-600 bg-gradient-to-r from-green-50 to-white">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-green-600">Next Meeting</Badge>
                </div>
                <CardTitle className="text-2xl">{programme?.title || 'Not planned yet'}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {nextMeeting.date.toLocaleDateString('en-GB', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </CardHeader>
              {programme?.description && (
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{programme.description}</p>
                </CardContent>
              )}
              <CardContent className="pt-0">
                <Button
                  onClick={() => handleMeetingClick(nextMeeting)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {programme ? 'View Details' : 'Plan Meeting'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })()}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-[#004851] border-t-transparent rounded-full mb-4" />
            <p className="text-gray-600 font-medium">Loading terms...</p>
          </div>
        ) : terms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-dashed border-2 border-gray-300 bg-white/50 backdrop-blur-sm">
              <CardContent className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-[#004851]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Terms Yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">Start organizing your weekly programme by creating your first term.</p>
                <Button 
                  onClick={() => setShowNewTermDialog(true)} 
                  size="lg"
                  className="bg-gradient-to-r from-[#004851] to-[#003840] hover:from-[#003840] hover:to-[#004851] shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Term
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : !currentTerm ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No term selected</p>
          </div>
        ) : (
          <motion.div
            key={currentTerm.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Term Header Card */}
            <Card className="mb-8 border-l-4 border-l-[#004851] bg-gradient-to-br from-white to-blue-50/30 shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-[#004851] text-white">
                        {currentSection?.display_name}
                      </Badge>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{currentTerm.meeting_day}s</span>
                        <span className="text-gray-400">•</span>
                        <span>{currentTerm.meeting_start_time} - {currentTerm.meeting_end_time}</span>
                      </div>
                    </div>
                    <CardTitle className="text-3xl mb-3">{currentTerm.title}</CardTitle>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        {new Date(currentTerm.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} - {' '}
                        {new Date(currentTerm.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Meetings List */}
            <div className="space-y-3">
              {meetings.map((meeting, index) => {
                const programme = programmes.find(p => p.date === meeting.date.toISOString().split('T')[0]);
                
                if (meeting.isHalfTerm) {
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20"></div>
                      <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 relative">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <p className="font-bold text-amber-900">
                              Half Term - {meeting.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                }

                const isPast = meeting.date < new Date();

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card 
                      onClick={() => handleMeetingClick(meeting)}
                      className={`group cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 ${
                        programme?.published 
                          ? 'border-l-green-500 bg-gradient-to-r from-green-50/50 to-white' 
                          : isPast 
                          ? 'border-l-gray-300 bg-white/50'
                          : 'border-l-[#7413dc] bg-white hover:bg-purple-50/30'
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className={`font-bold text-lg ${isPast ? 'text-gray-600' : 'text-gray-900'} group-hover:text-[#7413dc] transition-colors`}>
                                {meeting.date.toLocaleDateString('en-GB', { 
                                  weekday: 'long', 
                                  day: 'numeric', 
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                              {programme?.published && (
                                <Badge className="bg-green-600 gap-1">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                  Published
                                </Badge>
                              )}
                            </div>
                            {programme ? (
                              <p className="text-gray-700 font-medium">{programme.title}</p>
                            ) : (
                              <p className="text-gray-400 italic">Not planned yet - click to add</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#7413dc] group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      <NewTermDialog
        open={showNewTermDialog}
        onOpenChange={(open) => {
          setShowNewTermDialog(open);
          if (!open) setEditingTerm(null);
        }}
        sections={sections}
        editTerm={editingTerm}
      />

      <AllTermsDialog
        open={showAllTermsDialog}
        onOpenChange={setShowAllTermsDialog}
        terms={terms}
        sections={sections}
        onSelectTerm={setSelectedTerm}
        onCreateNew={() => {
          setEditingTerm(null);
          setShowNewTermDialog(true);
        }}
      />
    </div>
  );
}