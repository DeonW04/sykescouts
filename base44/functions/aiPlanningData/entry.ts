import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildAiPlanningData } from '../../shared/aiPlanningBuilder.js';

Deno.serve(async (req) => {
  try {
    // ── Auth: API key via Authorization: Bearer <key> ──
    const expectedKey = Deno.env.get('AI_PLANNING_API_KEY');
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!expectedKey || !provided || provided !== expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Resolve sectionId from the payload (SDK invoke) or query string ──
    let sectionId = '';
    try {
      const body = await req.json();
      sectionId = body?.sectionId || body?.section_id || '';
    } catch (_e) { /* no JSON body */ }
    if (!sectionId) {
      const url = new URL(req.url);
      sectionId = url.searchParams.get('sectionId') || url.searchParams.get('section_id') || '';
      if (!sectionId) {
        const parts = url.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && last !== 'aiPlanningData') sectionId = last;
      }
    }

    const base44 = createClientFromRequest(req);
    const { status, body } = await buildAiPlanningData(base44.asServiceRole, sectionId);

    return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});