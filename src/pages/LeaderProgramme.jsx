import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Plus, ChevronRight, Sparkles, Clock, List, Pencil, Download, ArrowRight, Wand2, Ban } from 'lucide-react';
import NewTermDialog from '../components/programme/NewTermDialog';
import AllTermsDialog from '../components/programme/AllTermsDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { useSectionContext } from '../components/leader/SectionContext';
import AIPlannerModal from '../components/aiPlanner/AIPlannerModal';
import { toast } from 'sonner';

export default function LeaderProgramme() {
  const navigate = useNavigate();
  const { selectedSection } = useSectionContext();
  const [showNewTermDialog, setShowNewTermDialog] = useState(false);
  const [showAllTermsDialog, setShowAllTermsDialog] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [noMeetingDialog, setNoMeetingDialog] = useState(null); // date string or null
  const [noMeetingReason, setNoMeetingReason] = useState('');
  const queryClient = useQueryClient();

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ['terms', selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      const allTerms = await base44.entities.Term.filter({ 
        active: true, 
        section_id: selectedSection 
      });
      return allTerms.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    },
    enabled: !!selectedSection,
  });

  const currentTerm = selectedTerm || terms.find(t => {
    const today = new Date();
    return today >= new Date(t.start_date) && today <= new Date(t.end_date);
  }) || terms.find(t => new Date(t.start_date) > new Date()) || terms[0];

  const currentSection = sections.find(s => s.id === currentTerm?.section_id);

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
        allMeetings.push({ date: new Date(current), isHalfTerm });
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

  const { data: savedDraft } = useQuery({
    queryKey: ['ai-draft', currentTerm?.id],
    queryFn: () => base44.entities.AIProgrammePlan.filter({ term_id: currentTerm.id }),
    enabled: !!currentTerm,
    select: (data) => data?.[0] || null,
  });

  const markNoMeetingMutation = useMutation({
    mutationFn: async ({ date, unmark, existingProg }) => {
      if (unmark && existingProg) {
        await base44.entities.Programme.delete(existingProg.id);
      } else {
        const existing = programmes.find(p => p.date === date);
        if (existing) {
          await base44.entities.Programme.update(existing.id, {
            no_meeting: true,
            no_meeting_reason: noMeetingReason,
            published: true,
            title: 'No Meeting',
          });
        } else {
          await base44.entities.Programme.create({
            section_id: currentTerm.section_id,
            date,
            title: 'No Meeting',
            no_meeting: true,
            no_meeting_reason: noMeetingReason,
            published: true,
            shown_in_portal: true,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes'] });
      setNoMeetingDialog(null);
      setNoMeetingReason('');
      toast.success('Meeting status updated');
    },
  });

  const handleMeetingClick = (meeting) => {
    if (meeting.isHalfTerm) return;
    const dateStr = meeting.date.toISOString().split('T')[0];
    navigate(createPageUrl('MeetingDetail') + `?section_id=${currentTerm.section_id}&date=${dateStr}&term_id=${currentTerm.id}`);
  };

  const preFilled = currentTerm ? programmes
    .filter(p => {
      if (!p.title) return false;
      const d = new Date(p.date);
      return d >= new Date(currentTerm.start_date) && d <= new Date(currentTerm.end_date);
    })
    .map(p => ({ date: p.date, title: p.title })) : [];

  const handleAIGenerated = (result) => {
    sessionStorage.setItem('ai_plan_data', JSON.stringify({
      ...result,
      term: currentTerm,
      section: currentSection,
      section_id: currentTerm?.section_id,
      term_id: currentTerm?.id,
    }));
    setShowAIModal(false);
    navigate(createPageUrl('AIProgrammePlanner'));
  };

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
              className="bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20 font-semibold self-start md:self-auto"
            >
              <List className="w-5 h-5 mr-2" />
              Past & Future Terms
            </Button>
          </div>
        </div>
      </div>

      {/* AI Banner */}
      {currentTerm && (
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {savedDraft ? (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  sessionStorage.setItem('ai_plan_data', JSON.stringify({
                    meetings: savedDraft.generated_meetings || [],
                    engagement_score: savedDraft.engagement_score,
                    engagement_summary: savedDraft.engagement_summary,
                    term: currentTerm,
                    section: currentSection,
                    section_id: currentTerm.section_id,
                    term_id: currentTerm.id,
                    meetingDates: [],
                    preFilled: [],
                    sliders: {
                      adventure: savedDraft.slider_adventure,
                      competition: savedDraft.slider_competition,
                      outdoor: savedDraft.slider_outdoor,
                      badgeFocus: savedDraft.slider_badge_focus,
                    },
                    notes: savedDraft.notes,
                    theme: savedDraft.theme,
                    youthVoice: savedDraft.youth_voice,
                  }));
                  navigate(createPageUrl('AIProgrammePlanner'));
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 hover:border-violet-400 hover:shadow-md transition-all duration-200 group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-violet-900 text-sm">You have a saved AI draft for this term</p>
                  <p className="text-violet-600 text-xs truncate">
                    {savedDraft.generated_meetings?.length || 0} meetings planned · tap to continue editing
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </motion.button>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowAIModal(true)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 group text-left"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"
                >
                  <Wand2 className="w-5 h-5 text-amber-600" />
                </motion.div>
                <div className="flex-1">
                  <p className="font-bold text-amber-900 text-sm">✨ Generate this term's full programme with AI</p>
                  <p className="text-amber-600 text-xs">Let AI plan engaging weekly meetings tailored to your section</p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </motion.button>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Next Meeting Highlight */}
        {!isLoading && currentTerm && meetings.length > 0 && (() => {
          const nextMeeting = meetings.find(m => !m.isHalfTerm && m.date >= new Date());
          if (!nextMeeting) return null;
          const programme = programmes.find(p => p.date === nextMeeting.date.toISOString().split('T')[0]);
          if (programme?.no_meeting) return null;

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
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
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
                <Button onClick={() => handleMeetingClick(nextMeeting)} className="bg-green-600 hover:bg-green-700">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
          <motion.div key={currentTerm.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Term Header Card */}
            <Card className="mb-8 border-l-4 border-l-[#004851] bg-gradient-to-br from-white to-blue-50/30 shadow-xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className="bg-[#004851] text-white">{currentSection?.display_name}</Badge>
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
                        {new Date(currentTerm.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} -{' '}
                        {new Date(currentTerm.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingTerm(currentTerm); setShowNewTermDialog(true); }}
                    className="flex items-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Term
                  </Button>
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
                const dateStr = meeting.date.toISOString().split('T')[0];
                const isNoMeeting = programme?.no_meeting === true;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      onClick={() => !isNoMeeting && handleMeetingClick(meeting)}
                      className={`group transition-all duration-300 border-l-4 ${
                        isNoMeeting
                          ? 'border-l-red-300 bg-red-50/50 cursor-default'
                          : programme?.published
                          ? 'border-l-green-500 bg-gradient-to-r from-green-50/50 to-white cursor-pointer hover:shadow-xl'
                          : isPast
                          ? 'border-l-gray-300 bg-white/50 cursor-pointer'
                          : 'border-l-[#7413dc] bg-white hover:bg-purple-50/30 cursor-pointer hover:shadow-xl'
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <p className={`font-bold text-lg ${isPast ? 'text-gray-600' : 'text-gray-900'} ${!isNoMeeting ? 'group-hover:text-[#7413dc]' : ''} transition-colors`}>
                                {meeting.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              {programme?.published && !isNoMeeting && (
                                <Badge className="bg-green-600 gap-1">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                  Published
                                </Badge>
                              )}
                              {isNoMeeting && (
                                <Badge className="bg-red-500 text-white gap-1">
                                  <Ban className="w-3 h-3" />
                                  No Meeting
                                </Badge>
                              )}
                            </div>
                            {isNoMeeting ? (
                              <div>
                                <p className="text-red-600 font-medium text-sm">No meeting scheduled this session</p>
                                {programme.no_meeting_reason && (
                                  <p className="text-sm text-gray-500 mt-0.5">{programme.no_meeting_reason}</p>
                                )}
                              </div>
                            ) : programme ? (
                              <p className="text-gray-700 font-medium">{programme.title}</p>
                            ) : (
                              <p className="text-gray-400 italic">Not planned yet - click to add</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!isPast && (
                              isNoMeeting ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markNoMeetingMutation.mutate({ date: dateStr, unmark: true, existingProg: programme });
                                  }}
                                  disabled={markNoMeetingMutation.isPending}
                                  className="text-red-600 hover:bg-red-100 text-xs"
                                >
                                  Unmark
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNoMeetingDialog(dateStr);
                                    setNoMeetingReason('');
                                  }}
                                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Ban className="w-3.5 h-3.5 mr-1" />
                                  No Meeting
                                </Button>
                              )
                            )}
                            {!isNoMeeting && (
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#7413dc] group-hover:translate-x-1 transition-all" />
                            )}
                          </div>
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

      {/* No Meeting Dialog */}
      <Dialog open={!!noMeetingDialog} onOpenChange={(o) => !o && setNoMeetingDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Mark as No Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600">
              Parents will see "No Meeting" for{' '}
              <strong>
                {noMeetingDialog && new Date(noMeetingDialog).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </strong>.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Reason (optional)</label>
              <Input
                placeholder="e.g. Bank Holiday, Leader training day..."
                value={noMeetingReason}
                onChange={(e) => setNoMeetingReason(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && markNoMeetingMutation.mutate({ date: noMeetingDialog })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNoMeetingDialog(null)}>Cancel</Button>
              <Button
                onClick={() => markNoMeetingMutation.mutate({ date: noMeetingDialog })}
                disabled={markNoMeetingMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {markNoMeetingMutation.isPending ? 'Saving...' : 'Mark No Meeting'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NewTermDialog
        open={showNewTermDialog}
        onOpenChange={(open) => {
          setShowNewTermDialog(open);
          if (!open) setEditingTerm(null);
        }}
        sections={sections.filter(s => s.id === selectedSection)}
        editTerm={editingTerm}
      />

      <AllTermsDialog
        open={showAllTermsDialog}
        onOpenChange={setShowAllTermsDialog}
        terms={terms}
        sections={sections.filter(s => s.id === selectedSection)}
        onSelectTerm={setSelectedTerm}
        onCreateNew={() => {
          setEditingTerm(null);
          setShowNewTermDialog(true);
        }}
      />

      <AnimatePresence>
        {showAIModal && currentTerm && (
          <AIPlannerModal
            term={currentTerm}
            section={currentSection}
            meetings={meetings}
            preFilled={preFilled}
            sectionId={selectedSection}
            onClose={() => setShowAIModal(false)}
            onGenerated={handleAIGenerated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}