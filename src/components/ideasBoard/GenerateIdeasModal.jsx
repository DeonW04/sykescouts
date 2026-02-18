import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, X, Loader2, ChevronLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, addWeeks } from 'date-fns';

export default function GenerateIdeasModal({ sectionId, section, activeTab, user, onClose, onAdd }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('params'); // 'params' | 'results'
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [accepted, setAccepted] = useState(new Set());
  const [rejected, setRejected] = useState(new Set());

  const today = new Date();
  const [dateFrom, setDateFrom] = useState(format(today, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(addWeeks(today, 4), 'yyyy-MM-dd'));
  const [selectedBadgeIds, setSelectedBadgeIds] = useState([]);
  const [includeNonBadge, setIncludeNonBadge] = useState(true);

  // Fetch all data needed for AI prompt
  const { data: allBadgeDefs = [] } = useQuery({
    queryKey: ['allBadgeDefs'],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['membersBySection', sectionId],
    queryFn: () => base44.entities.Member.filter({ section_id: sectionId, active: true }),
    enabled: !!sectionId,
  });

  const { data: memberBadgeProgress = [] } = useQuery({
    queryKey: ['memberBadgeProgressForSection', sectionId],
    queryFn: async () => {
      if (!allMembers.length) return [];
      const memberIds = allMembers.map(m => m.id);
      const allProgress = await base44.entities.MemberBadgeProgress.filter({});
      return allProgress.filter(p => memberIds.includes(p.member_id));
    },
    enabled: allMembers.length > 0,
  });

  const { data: upcomingProgramme = [] } = useQuery({
    queryKey: ['upcomingProgrammeForSection', sectionId],
    queryFn: async () => {
      const prog = await base44.entities.Programme.filter({ section_id: sectionId });
      const twoMonthsLater = new Date();
      twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
      return prog.filter(p => p.date && new Date(p.date) >= today && new Date(p.date) <= twoMonthsLater);
    },
    enabled: !!sectionId,
  });

  const { data: rejectedIdeas = [] } = useQuery({
    queryKey: ['rejectedIdeas', sectionId],
    queryFn: () => base44.entities.RejectedIdea.filter({ section_id: sectionId }),
    enabled: !!sectionId,
  });

  const { data: existingIdeas = [] } = useQuery({
    queryKey: ['programmeIdeas', sectionId],
    queryFn: () => base44.entities.ProgrammeIdea.filter({ section_id: sectionId }),
    enabled: !!sectionId,
  });

  // Badges relevant to section
  const sectionName = section?.name?.toLowerCase() || '';
  const relevantBadges = allBadgeDefs.filter(b =>
    !b.section || b.section === 'all' || b.section?.toLowerCase() === sectionName
  );

  const toggleBadge = (id) => {
    setSelectedBadgeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const buildPrompt = () => {
    const sectionDisplay = section?.display_name || sectionName;

    // Badge criteria summary
    const targetBadges = selectedBadgeIds.length > 0
      ? relevantBadges.filter(b => selectedBadgeIds.includes(b.id))
      : relevantBadges.slice(0, 20);

    const badgeSummary = targetBadges.map(b => {
      const requirements = b.requirements?.map(r => r.description).join('; ') || '';
      return `- ${b.name} (${b.category}): ${requirements}`;
    }).join('\n');

    // Member badge gaps
    const earnedBadgeIds = new Set(
      memberBadgeProgress.filter(p => p.status === 'awarded').map(p => p.badge_definition_id)
    );
    const neededBadges = targetBadges.filter(b => !earnedBadgeIds.has(b.id));
    const neededSummary = neededBadges.slice(0, 10).map(b => b.name).join(', ');

    // Upcoming programme
    const programmeSummary = upcomingProgramme.map(p =>
      `- ${p.date}: ${p.title}`
    ).join('\n') || 'None scheduled';

    // Rejected titles
    const rejectedTitles = rejectedIdeas.map(r => r.title).join(', ') || 'None';

    // Existing ideas already on the board
    const existingTitles = existingIdeas
      .filter(i => i.status === 'active')
      .map(i => i.title)
      .join(', ') || 'None';

    const typeLabel = activeTab === 'meeting' ? 'weekly meeting programme ideas' : 'scouting events or camps';

    // Build calendar context for the date range
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const months = [];
    const cur = new Date(fromDate);
    while (cur <= toDate) {
      months.push(cur.toLocaleString('en-GB', { month: 'long', year: 'numeric' }));
      cur.setMonth(cur.getMonth() + 1);
    }
    const calendarContext = months.join(', ');

    const badgeListForMatching = relevantBadges.slice(0, 30).map(b => `${b.id}|${b.name}`).join('\n');

    return `You are an expert Scout leader helping plan ${typeLabel} for the ${sectionDisplay} section (age group: ${section?.age_range || 'unknown'}).

Generate 6 creative, age-appropriate ${typeLabel} for the date range ${dateFrom} to ${dateTo} (covering: ${calendarContext}).

BADGE CRITERIA AVAILABLE FOR THIS SECTION:
${badgeSummary || 'See general scouting badge curriculum'}

BADGES MEMBERS STILL NEED TO EARN (prioritise these):
${neededSummary || 'Various badges still in progress'}

UPCOMING PROGRAMME (avoid clashes, complement these):
${programmeSummary}

PREVIOUSLY REJECTED IDEAS (do NOT suggest these again):
${rejectedTitles}

CALENDAR AWARENESS — CRITICAL:
- Consider UK public holidays, school holidays, and seasonal events that fall within ${dateFrom} to ${dateTo}.
- Check for relevant "International Day of..." observances (e.g. World Environment Day, International Day of Forests, World Space Week, etc.) that fall in this period.
- Check for UK seasonal events, religious observances, and awareness days that could inspire themed activities.
- Where an idea is inspired by a specific date or event, mention it in the rationale.

PARAMETERS:
- Date range: ${dateFrom} to ${dateTo}
- Focus badges: ${selectedBadgeIds.length > 0 ? targetBadges.map(b => b.name).join(', ') : 'All relevant badges'}
- Non-badge ideas: ${includeNonBadge ? 'YES — include general activity ideas, but still include 1-2 badge-focused ideas in the mix' : 'NO — every idea must link to a badge'}
- Type: ${activeTab === 'meeting' ? 'Meeting programme activities' : 'Events/camps/day trips'}

INCIDENTAL BADGE COVERAGE — IMPORTANT:
Even for general non-badge activities, think about whether the activity naturally covers any badge criteria. 
For example, a campfire cooking session might incidentally cover parts of the Chef badge or Outdoor badge even if not designed around it.
Use the badge list below to identify incidental matches (use the ID before the | character):
${badgeListForMatching}

For each idea also suggest what resources/equipment would be needed (craft supplies, venue, outdoor kit, printed materials, etc.) so leaders can plan ahead.

Return a JSON object with an "ideas" array of exactly 6 objects with these fields:
- title: string (short, catchy title)
- description: string (2-3 sentences, practical detail)
- badgeIds: array of badge IDs this activity is DESIGNED around (empty if general)
- badgeNames: array of badge names this activity is DESIGNED around
- incidentalBadgeIds: array of badge IDs this activity might INCIDENTALLY cover (even if not the focus)
- incidentalBadgeNames: array of badge names this activity might incidentally cover
- suggestedWeek: string (e.g. "Week of 10 Mar" or specific date)
- type: "${activeTab}"
- rationale: string (one sentence: why this is good for this group right now, mention any relevant calendar event/date)
- resources: string (comma-separated list of materials, equipment or venue needed)

Example: {"ideas": [{"title":"...", "description":"...", "badgeIds":[], "badgeNames":[], "incidentalBadgeIds":[], "incidentalBadgeNames":[], "suggestedWeek":"...", "type":"${activeTab}", "rationale":"...", "resources":"..."}]}`;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const prompt = buildPrompt();
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            ideas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  badgeIds: { type: 'array', items: { type: 'string' } },
                  badgeNames: { type: 'array', items: { type: 'string' } },
                  suggestedWeek: { type: 'string' },
                  type: { type: 'string' },
                  rationale: { type: 'string' },
                }
              }
            }
          }
        }
      });

      let ideas = [];
      if (response?.ideas) {
        ideas = response.ideas;
      } else if (Array.isArray(response)) {
        ideas = response;
      }

      if (!ideas.length) throw new Error('No ideas returned');
      setResults(ideas);
      setAccepted(new Set());
      setRejected(new Set());
      setStep('results');
    } catch (err) {
      toast.error('Failed to generate ideas. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleReject = async (idx) => {
    setRejected(prev => new Set([...prev, idx]));
    const idea = results[idx];
    await base44.entities.RejectedIdea.create({
      section_id: sectionId,
      title: idea.title,
      description: idea.description,
      rejected_by_id: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['rejectedIdeas', sectionId] });
  };

  const handleAccept = (idx) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleAddAccepted = async () => {
    const toAdd = results
      .filter((_, i) => accepted.has(i) && !rejected.has(i))
      .map(idea => ({
        type: idea.type || activeTab,
        title: idea.title,
        description: idea.description,
        badge_ids: idea.badgeIds || [],
        incidental_badge_ids: idea.incidentalBadgeIds || [],
        incidental_badge_names: idea.incidentalBadgeNames || [],
        resources: idea.resources || '',
        suggested_week: idea.suggestedWeek,
        ai_rationale: idea.rationale,
        source: 'ai_generated',
      }));
    if (!toAdd.length) { toast.error('Select at least one idea to add'); return; }
    await onAdd(toAdd);
    toast.success(`${toAdd.length} idea${toAdd.length > 1 ? 's' : ''} added to board!`);
  };

  const visibleResults = results.filter((_, i) => !rejected.has(i));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Generate Programme Ideas
            {section && <span className="text-sm font-normal text-gray-500 ml-1">— {section.display_name}</span>}
          </DialogTitle>
        </DialogHeader>

        {step === 'params' && (
          <div className="space-y-5 mt-2">
            {/* Date range */}
            <div>
              <Label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Date Range</Label>
              <div className="flex gap-3 mt-1.5">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Badge selector */}
            <div>
              <Label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                Focus Badges (optional — leave empty for all)
              </Label>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-3 space-y-1.5 bg-gray-50">
                {relevantBadges.length === 0 && (
                  <p className="text-xs text-gray-400">No badges found for this section</p>
                )}
                {relevantBadges.map(b => (
                  <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-white rounded px-1 py-0.5">
                    <Checkbox
                      checked={selectedBadgeIds.includes(b.id)}
                      onCheckedChange={() => toggleBadge(b.id)}
                    />
                    <span className="text-gray-700">{b.name}</span>
                    <span className="text-xs text-gray-400 capitalize">({b.category})</span>
                  </label>
                ))}
              </div>
              {selectedBadgeIds.length > 0 && (
                <p className="text-xs text-purple-600 mt-1">{selectedBadgeIds.length} badge(s) selected</p>
              )}
            </div>

            {/* Non-badge ideas */}
            <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Non-badge ideas</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={includeNonBadge}
                  onCheckedChange={v => setIncludeNonBadge(!!v)}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">Include non-badge ideas</p>
                  <p className="text-xs text-gray-400">
                    {selectedBadgeIds.length === 0 && includeNonBadge
                      ? 'No badges selected — all ideas will be non-badge general activities'
                      : 'Mix in fun general scouting activities not tied to badges'}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-gradient-to-r from-violet-600 to-purple-700 text-white"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Ideas</>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep('params')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back to parameters
              </button>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">{visibleResults.length} ideas generated</span>
            </div>

            <div className="space-y-3">
              {results.map((idea, idx) => {
                if (rejected.has(idx)) return null;
                const isAccepted = accepted.has(idx);
                return (
                  <div
                    key={idx}
                    className={`border rounded-xl p-4 transition-all ${
                      isAccepted
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800 text-sm">{idea.title}</h3>
                          {idea.suggestedWeek && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              📅 {idea.suggestedWeek}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{idea.description}</p>

                        {idea.badgeNames?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {idea.badgeNames.map((name, i) => (
                              <span key={i} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                🏅 {name}
                              </span>
                            ))}
                          </div>
                        )}

                        {(!idea.badgeNames?.length) && (
                          <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full mt-2 inline-block">
                            🌟 General Scouting
                          </span>
                        )}

                        {idea.incidentalBadgeNames?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {idea.incidentalBadgeNames.map((name, i) => (
                              <span key={i} className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full border border-amber-200">
                                ✨ {name}
                              </span>
                            ))}
                          </div>
                        )}

                        {idea.resources && (
                          <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">
                            🎒 <span className="font-medium">Resources:</span> {idea.resources}
                          </p>
                        )}

                        {idea.rationale && (
                          <p className="text-xs text-purple-600 mt-2 italic">💡 {idea.rationale}</p>
                        )}
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAccept(idx)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                            isAccepted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-green-300 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {isAccepted ? 'Selected' : 'Add'}
                        </button>
                        <button
                          onClick={() => handleReject(idx)}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {accepted.size > 0 && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <p className="text-sm text-gray-600">{accepted.size} idea{accepted.size > 1 ? 's' : ''} selected</p>
                <Button
                  onClick={handleAddAccepted}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Add {accepted.size} to Board
                </Button>
              </div>
            )}

            {visibleResults.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p>All ideas rejected.</p>
                <button onClick={() => setStep('params')} className="text-purple-600 text-sm mt-2 hover:underline">
                  Generate more →
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}