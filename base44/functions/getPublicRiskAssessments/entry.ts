import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { id, type } = await req.json().catch(() => ({}));
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    let title = 'Session', date = '', raIds = [];

    if (type === 'event') {
      const events = await base44.asServiceRole.entities.Event.filter({ id });
      if (events[0]) {
        title = events[0].title;
        date = events[0].start_date;
        raIds = events[0].risk_assessment_ids || [];
      }
    } else {
      const meetings = await base44.asServiceRole.entities.Programme.filter({ id });
      if (meetings[0]) {
        title = meetings[0].title;
        date = meetings[0].date;
        raIds = meetings[0].risk_assessment_ids || [];
      }
    }

    let risk_assessments = [];
    if (raIds.length > 0) {
      const fetched = await Promise.all(
        raIds.map(raId => base44.asServiceRole.entities.RiskAssessment.get(raId).catch(() => null))
      );
      risk_assessments = fetched.filter(Boolean);
    }

    return Response.json({ title, date, type: type || 'meeting', risk_assessments });
  } catch (err) {
    console.error('getPublicRiskAssessments error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});