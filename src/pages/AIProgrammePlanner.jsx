import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Star, Zap, Flame, RefreshCw, Save, Globe, ArrowLeft,
  ChevronDown, ChevronUp, Trash2, Clock, DollarSign, CloudRain,
  Trophy, Users, Tent, Brush, Heart, Leaf, Loader2, CheckCircle,
  AlertTriangle, BarChart3, Download, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import AIPlannerModal from '../components/aiPlanner/AIPlannerModal';

const ENGAGEMENT_ICONS = {
  competition: Trophy,
  collaboration: Users,
  adventure: Flame,
  creative: Brush,
  community: Heart,
  leadership: Star,
  skills: Zap,
};

const ENGAGEMENT_COLORS = {
  competition: 'bg-amber-100 text-amber-700',
  collaboration: 'bg-blue-100 text-blue-700',
  adventure: 'bg-red-100 text-red-700',
  creative: 'bg-pink-100 text-pink-700',
  community: 'bg-green-100 text-green-700',
  leadership: 'bg-purple-100 text-purple-700',
  skills: 'bg-cyan-100 text-cyan-700',
};

const COST_COLORS = { free: 'text-green-600', low: 'text-amber-600', medium: 'text-orange-600' };
const RISK_COLORS = { low: 'text-green-600', medium: 'text-amber-600' };

function MeetingCard({ meeting, index, onRemove, onReject, isPreFilled }) {
  const [expanded, setExpanded] = useState(false);
  const EngagementIcon = ENGAGEMENT_ICONS[meeting.engagement_type] || Sparkles;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03 }}
      className={`relative rounded-2xl border-2 overflow-hidden shadow-sm transition-all duration-200 ${
        isPreFilled
          ? 'border-gray-200 bg-gray-50 opacity-70'
          : meeting.is_spectacle
          ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-amber-100 shadow-md'
          : 'border-gray-200 bg-white hover:shadow-md hover:border-[#7413dc]/30'
      }`}
    >
      {meeting.is_spectacle && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
          <Star className="w-3 h-3" /> SPECTACLE
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Date badge */}
          <div className="flex-shrink-0 w-14 text-center">
            <div className="bg-[#004851] text-white rounded-xl px-2 py-2">
              <p className="text-xs opacity-70">
                {new Date(meeting.date).toLocaleDateString('en-GB', { weekday: 'short' })}
              </p>
              <p className="text-lg font-bold leading-none">
                {new Date(meeting.date).toLocaleDateString('en-GB', { day: 'numeric' })}
              </p>
              <p className="text-xs opacity-70">
                {new Date(meeting.date).toLocaleDateString('en-GB', { month: 'short' })}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className={`font-bold text-base text-gray-900 leading-tight ${isPreFilled ? 'text-gray-500' : ''}`}>
                {meeting.title}
                {isPreFilled && <span className="ml-2 text-xs font-normal text-gray-400">(pre-filled)</span>}
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-3">{meeting.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {meeting.engagement_type && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ENGAGEMENT_COLORS[meeting.engagement_type] || 'bg-gray-100 text-gray-600'}`}>
                  <EngagementIcon className="w-3 h-3" />
                  {meeting.engagement_type}
                </span>
              )}
              {meeting.weather && (
                <span className="inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full font-medium">
                  <CloudRain className="w-3 h-3" />
                  {meeting.weather}
                </span>
              )}
              {meeting.cost && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-100 ${COST_COLORS[meeting.cost] || 'text-gray-600'}`}>
                  💰 {meeting.cost}
                </span>
              )}
              {meeting.risk_level && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-100 ${RISK_COLORS[meeting.risk_level] || 'text-gray-600'}`}>
                  ⚠️ {meeting.risk_level} risk
                </span>
              )}
              {meeting.prep_time && (
                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> {meeting.prep_time} prep
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        {!isPreFilled && (meeting.activities?.length > 0 || meeting.badge_criteria?.length > 0 || meeting.equipment) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-[#7413dc] font-medium hover:underline"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 border-t pt-4">
                {meeting.activities?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">Activities</p>
                    <ul className="space-y-1">
                      {meeting.activities.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="w-4 h-4 bg-[#7413dc] text-white rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meeting.badge_criteria?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">Badge Criteria Covered</p>
                    <div className="flex flex-wrap gap-1">
                      {meeting.badge_criteria.map((c, i) => (
                        <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {meeting.equipment && (
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-1">Equipment needed</p>
                    <p className="text-xs text-gray-600">{meeting.equipment}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {!isPreFilled && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onReject(meeting)}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Remove & reject
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AIProgrammePlanner() {
  const navigate = useNavigate();
  const [planData, setPlanData] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ai_plan_data');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [meetings, setMeetings] = useState(() => planData?.meetings || []);
  const [rejectedTitles, setRejectedTitles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [refilling, setRefilling] = useState(false);

  // If no plan data, show empty state with back button
  if (!planData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <LeaderNav />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No Programme Plan Found</h2>
          <p className="text-gray-600 mb-8">Use the AI Programme Generator on the Programme Planning page to create a plan first.</p>
          <Button onClick={() => navigate(createPageUrl('LeaderProgramme'))} className="bg-[#004851] hover:bg-[#003840]">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Programme
          </Button>
        </div>
      </div>
    );
  }

  const term = planData.term;
  const section = planData.section;
  const preFilled = planData.preFilled || [];
  const engagementScore = planData.engagement_score;
  const engagementSummary = planData.engagement_summary;

  const handleReject = (meeting) => {
    setRejectedTitles(prev => [...prev, meeting.title]);
    setMeetings(prev => prev.filter(m => m.date !== meeting.date || m.is_prefilled));
    toast('Meeting removed', { description: 'AI will not suggest this again if you regenerate.' });
  };

  const handleRefill = async () => {
    setRefilling(true);
    try {
      const filledDates = meetings.map(m => m.date);
      const allDates = planData.meetingDates || [];
      const emptyDates = allDates.filter(d => !filledDates.includes(d) && !preFilled.some(p => p.date === d));

      if (emptyDates.length === 0) {
        toast.info('All dates are already filled!');
        setRefilling(false);
        return;
      }

      const res = await base44.functions.invoke('generateAIProgramme', {
        ...planData,
        meetingDates: emptyDates,
        rejectedIdeas: rejectedTitles,
        refillOnly: true,
        existingMeetings: meetings.map(m => ({ date: m.date })),
      });
      if (res.data?.error) throw new Error(res.data.error);
      const newMeetings = res.data.meetings || [];
      setMeetings(prev => [...prev, ...newMeetings].sort((a, b) => new Date(a.date) - new Date(b.date)));
      toast.success(`Added ${newMeetings.length} new meetings!`);
    } catch (e) {
      toast.error('Failed to refill: ' + e.message);
    } finally {
      setRefilling(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.AIProgrammePlan.filter({ term_id: term?.id });
      const planPayload = {
        section_id: section?.id || planData.section_id,
        term_id: term?.id || planData.term_id,
        status: 'draft',
        generated_meetings: meetings,
        engagement_score: engagementScore,
        engagement_summary: engagementSummary,
        rejected_ideas: rejectedTitles,
        slider_adventure: planData.sliders?.adventure,
        slider_competition: planData.sliders?.competition,
        slider_outdoor: planData.sliders?.outdoor,
        slider_badge_focus: planData.sliders?.badgeFocus,
        notes: planData.notes,
        theme: planData.theme,
        youth_voice: planData.youthVoice,
      };
      if (existing.length > 0) {
        await base44.entities.AIProgrammePlan.update(existing[0].id, planPayload);
      } else {
        await base44.entities.AIProgrammePlan.create(planPayload);
      }
      toast.success('Draft saved!');
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const sectionId = section?.id || planData.section_id;
      // Save each meeting as a Programme record
      for (const meeting of meetings) {
        if (meeting.is_prefilled) continue;
        const existing = await base44.entities.Programme.filter({ section_id: sectionId, date: meeting.date });
        const payload = {
          section_id: sectionId,
          date: meeting.date,
          title: meeting.title,
          description: meeting.description,
          activities: (meeting.activities || []).map(a => ({ activity: a })),
          equipment_needed: meeting.equipment,
          published: false,
        };
        if (existing.length > 0) {
          await base44.entities.Programme.update(existing[0].id, payload);
        } else {
          await base44.entities.Programme.create(payload);
        }
      }
      // Mark plan as published
      const existing = await base44.entities.AIProgrammePlan.filter({ term_id: term?.id });
      if (existing.length > 0) {
        await base44.entities.AIProgrammePlan.update(existing[0].id, { status: 'published', generated_meetings: meetings });
      }
      toast.success(`Programme published! ${meetings.filter(m => !m.is_prefilled).length} meetings added.`);
      navigate(createPageUrl('LeaderProgramme'));
    } catch (e) {
      toast.error('Publish failed: ' + e.message);
    } finally {
      setPublishing(false);
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const generatedCount = meetings.filter(m => !m.is_prefilled).length;
  const spectacleCount = meetings.filter(m => m.is_spectacle).length;

  const scoreColor = engagementScore >= 8 ? 'text-green-600' : engagementScore >= 6 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = engagementScore >= 8 ? 'bg-green-50 border-green-200' : engagementScore >= 6 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <LeaderNav />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#004851] to-[#7413dc] text-white py-8 sticky top-20 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(createPageUrl('LeaderProgramme'))} className="text-white/70 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <h1 className="text-xl font-bold">AI Programme Draft</h1>
                </div>
                <p className="text-white/70 text-sm">{term?.title} · {generatedCount} meetings generated</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleRefill}
                disabled={refilling}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              >
                {refilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Fill Blanks Again
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={saving}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Draft
              </Button>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-white text-[#004851] hover:bg-white/90 font-bold gap-2 shadow-lg"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Publish to Programme
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Sparkles className="w-5 h-5 text-purple-600" />} value={generatedCount} label="Meetings planned" color="purple" />
          <StatCard icon={<Star className="w-5 h-5 text-amber-600" />} value={spectacleCount} label="Spectacle events" color="amber" />
          <StatCard icon={<Trash2 className="w-5 h-5 text-red-500" />} value={rejectedTitles.length} label="Rejected" color="red" />
          <div className={`rounded-2xl border-2 p-4 ${scoreBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-medium text-gray-600">Engagement Score</span>
            </div>
            <p className={`text-3xl font-black ${scoreColor}`}>{engagementScore}<span className="text-lg font-normal text-gray-400">/10</span></p>
          </div>
        </div>

        {/* Engagement summary */}
        {engagementSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border-2 p-4 mb-8 ${scoreBg}`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${engagementScore >= 8 ? 'bg-green-100' : 'bg-amber-100'}`}>
                {engagementScore >= 8 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm mb-0.5">AI Assessment</p>
                <p className="text-sm text-gray-700">{engagementSummary}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Meetings list */}
        <div className="space-y-4">
          <AnimatePresence>
            {sortedMeetings.map((meeting, index) => {
              const isPreFilled = preFilled.some(p => p.date === meeting.date);
              return (
                <MeetingCard
                  key={`${meeting.date}-${index}`}
                  meeting={meeting}
                  index={index}
                  isPreFilled={isPreFilled}
                  onRemove={() => {}}
                  onReject={handleReject}
                />
              );
            })}
          </AnimatePresence>
        </div>

        {meetings.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg">No meetings generated yet.</p>
            <Button onClick={() => navigate(createPageUrl('LeaderProgramme'))} className="mt-6 bg-[#7413dc]">
              Back to Programme
            </Button>
          </div>
        )}

        {/* Bottom actions */}
        {meetings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={handleSaveDraft}
              disabled={saving}
              variant="outline"
              size="lg"
              className="gap-2 border-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Draft
            </Button>
            <Button
              onClick={handlePublish}
              disabled={publishing}
              size="lg"
              className="bg-gradient-to-r from-[#004851] to-[#7413dc] hover:opacity-90 text-white font-bold gap-2 shadow-xl px-8"
            >
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
              Publish Full Programme
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  const colors = {
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
    green: 'bg-green-50 border-green-200',
  };
  return (
    <div className={`rounded-2xl border-2 p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">{icon} <span className="text-xs font-medium text-gray-600">{label}</span></div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
    </div>
  );
}