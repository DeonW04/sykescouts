import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { buildAiPlanningData } from '../../shared/aiPlanningBuilder.js';

// Admin-only wrapper around the AI planning data builder.
// Authenticates via the logged-in user's session (must be an admin),
// so the frontend never needs the AI_PLANNING_API_KEY.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify the caller is a logged-in admin
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
    }

    let sectionId = '';
    try {
      const body = await req.json();
      sectionId = body?.sectionId || body?.section_id || '';
    } catch (_e) { /* no JSON body */ }

    const { status, body } = await buildAiPlanningData(base44.asServiceRole, sectionId);
    return Response.json(body, { status });
  } catch (error) {
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
});