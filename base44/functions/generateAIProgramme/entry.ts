import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      term, section, meetingDates, preFilled,
      selectedIdeas, selectedCriteria, notableDates,
      sliders, notes, youthVoice, theme, rejectedIdeas, refillOnly, existingMeetings
    } = body;

    // Build weather context from term month
    const termStartMonth = new Date(term.start_date).getMonth(); // 0-indexed
    const season = termStartMonth >= 2 && termStartMonth <= 4 ? 'Spring (mild, mix of outdoor/indoor)'
      : termStartMonth >= 5 && termStartMonth <= 7 ? 'Summer (warm, favour outdoor activities)'
      : termStartMonth >= 8 && termStartMonth <= 10 ? 'Autumn (cooler, mix, indoor cooking/fire focus)'
      : 'Winter (cold/dark, favour indoor but include night activities)';

    const outdoorBias = termStartMonth >= 5 && termStartMonth <= 7 ? 75
      : termStartMonth >= 2 && termStartMonth <= 4 ? 60
      : termStartMonth >= 8 && termStartMonth <= 10 ? 40 : 25;

    const effectiveOutdoor = Math.round((sliders.outdoor + outdoorBias) / 2);

    const datesNeedingPlanning = refillOnly
      ? meetingDates.filter(d => !existingMeetings?.some(m => m.date === d))
      : meetingDates.filter(d => !preFilled?.some(p => p.date === d));

    const preFilledStr = (preFilled || []).map(p =>
      `- ${p.date}: "${p.title}" (pre-filled, DO NOT change)`
    ).join('\n');

    const ideasStr = (selectedIdeas || []).map(i =>
      `- "${i.title}": ${i.description || ''}${i.badge_ids?.length ? ` [Badges: ${i.badge_ids.join(', ')}]` : ''}${i.preferredDate ? ` [Preferred date: ${i.preferredDate}]` : i.placement ? ` [Placement: ${i.placement}]` : ''}`
    ).join('\n');

    const criteriaStr = (selectedCriteria || []).map(c =>
      `- ${c.badgeName} → ${c.moduleName}: ${c.text}`
    ).join('\n');

    const notableDatesStr = (notableDates || []).map(d =>
      `- ${d.date}: ${d.label} (${d.action === 'theme' ? 'THEME activities around this' : 'AVOID meetings on this date'})`
    ).join('\n');

    const rejectedStr = (rejectedIdeas || []).join(', ');

    const prompt = `You are an expert Scout Programme Planner AI with 20 years of experience designing exciting, youth-led programmes for 10–14 year old Scouts working towards their Chief Scout's Gold Award.

TERM: ${term.title}
DATES: ${term.start_date} to ${term.end_date}
SECTION: ${section?.display_name || 'Scouts'} (${section?.name || 'scouts'})
MEETING DAY: ${term.meeting_day}s, ${term.meeting_start_time}–${term.meeting_end_time}
SEASON/WEATHER: ${season}
THEME THIS TERM: ${theme || 'None specified'}

DATES NEEDING PLANNING:
${datesNeedingPlanning.join(', ')}

PRE-FILLED MEETINGS (DO NOT CHANGE THESE):
${preFilledStr || 'None'}

SELECTED IDEAS TO INCORPORATE (respect preferred dates if given):
${ideasStr || 'None specified'}

BADGE CRITERIA TO COVER:
${criteriaStr || 'None specified'}

NOTABLE DATES:
${notableDatesStr || 'None'}

PROGRAMME PERSONALITY (0=left, 100=right):
- Adventure ↔ Comfort: ${sliders.adventure}/100 (${sliders.adventure > 60 ? 'High adventure – wide games, expeditions, challenges' : sliders.adventure < 40 ? 'Comfort focus – crafts, reflection, skill-building' : 'Balanced'})
- Competition ↔ Collaboration: ${sliders.competition}/100 (${sliders.competition > 60 ? 'Lots of patrol competitions, challenge nights' : 'More collaborative team projects'})
- Outdoor ↔ Indoor (season-adjusted): ${effectiveOutdoor}/100 (${effectiveOutdoor > 60 ? 'Mostly outdoor – camps, wide games, hikes' : effectiveOutdoor < 40 ? 'Mostly indoor – cooking, crafts, challenges' : 'Mix of both'})
- Badge-focused ↔ Pure fun: ${sliders.badgeFocus}/100 (${sliders.badgeFocus > 60 ? 'Strong badge progression focus' : sliders.badgeFocus < 40 ? 'Fun-first, badges incidental' : 'Balance of fun and badge work'})

LEADER NOTES:
${notes || 'None'}

YOUTH VOICE / PATROL SURVEY RESULTS:
${youthVoice || 'None provided'}

IDEAS/TITLES TO NEVER REPEAT (already rejected):
${rejectedStr || 'None'}

REQUIREMENTS:
1. Generate exactly ONE meeting per date in "DATES NEEDING PLANNING". Return ALL as JSON.
2. Never suggest anything in the rejected list.
3. Incorporate selected ideas on their preferred dates or near their placement tags.
4. Cover as many of the badge criteria as possible across the term.
5. Create a VARIETY: patrol competitions, survival skills, cooking challenges, wide games, leadership nights, creative sessions, community projects, surprise "wow" nights, bushcraft, photography, first aid – vary the type every week.
6. Include ONE "spectacle" meeting per term (is_spectacle: true) – something truly memorable and photogenic.
7. If older Scouts leading sessions was requested, include 2-3 where description notes "Scout-led session".
8. Factor in season: ${season}
9. For 10–14 year olds: use patrol system, make it high-energy, give them real responsibility, avoid anything that feels "too young".
10. Make titles catchy and exciting (e.g. "Operation Nightfall", "Survival of the Fittest", "MasterChef Scouts Edition").

Respond ONLY with valid JSON in this exact structure (no markdown, no explanation):
{
  "meetings": [
    {
      "date": "YYYY-MM-DD",
      "title": "string",
      "description": "2-3 sentence description of the session",
      "activities": ["activity 1", "activity 2", "activity 3"],
      "badge_criteria": ["brief criterion covered"],
      "badge_ids": [],
      "equipment": "comma-separated equipment list",
      "prep_time": "e.g. 30 mins",
      "cost": "free | low | medium",
      "risk_level": "low | medium",
      "weather": "indoor | outdoor | either",
      "engagement_type": "competition | collaboration | adventure | creative | community | leadership | skills",
      "is_spectacle": false,
      "is_prefilled": false
    }
  ],
  "engagement_score": 8,
  "engagement_summary": "One sentence explaining the score and one key suggestion."
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          meetings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                activities: { type: 'array', items: { type: 'string' } },
                badge_criteria: { type: 'array', items: { type: 'string' } },
                badge_ids: { type: 'array', items: { type: 'string' } },
                equipment: { type: 'string' },
                prep_time: { type: 'string' },
                cost: { type: 'string' },
                risk_level: { type: 'string' },
                weather: { type: 'string' },
                engagement_type: { type: 'string' },
                is_spectacle: { type: 'boolean' },
                is_prefilled: { type: 'boolean' }
              }
            }
          },
          engagement_score: { type: 'number' },
          engagement_summary: { type: 'string' }
        }
      },
      model: 'claude_sonnet_4_6'
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});