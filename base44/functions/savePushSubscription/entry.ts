import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LEADER_NOTIFICATION_TYPES = [
  { key: 'new_join_request', label: 'New join requests' },
  { key: 'new_volunteer_request', label: 'New volunteer applications' },
  { key: 'consent_form_submitted', label: 'Consent form submitted' },
];

const PARENT_NOTIFICATION_TYPES = [
  { key: 'new_action_required', label: 'New action required' },
  { key: 'new_consent_form', label: 'New consent form to sign' },
  { key: 'volunteer_request', label: 'Volunteer requests' },
  { key: 'event_reminder', label: 'Day-before event reminders' },
  { key: 'weekly_outstanding_actions', label: 'Weekly outstanding actions reminder' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { subscription, preferences } = body;

    if (subscription && !subscription?.endpoint) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Determine role
    let userRole = 'parent';
    if (user.role === 'admin') {
      userRole = 'leader';
    } else {
      const leaders = await base44.asServiceRole.entities.Leader.filter({ user_id: user.id });
      if (leaders.length > 0) userRole = 'leader';
    }

    // Build default preferences (all true)
    const types = userRole === 'leader' ? LEADER_NOTIFICATION_TYPES : PARENT_NOTIFICATION_TYPES;
    const defaultPrefs = {};
    types.forEach(t => { defaultPrefs[t.key] = true; });

    // Get existing subscription for this user
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: user.id });

    if (preferences && !subscription) {
      // Just updating preferences, keep existing subscription
      if (existing.length > 0) {
        const merged = { ...defaultPrefs, ...(existing[0].preferences || {}), ...preferences };
        await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, { preferences: merged });
        return Response.json({ success: true });
      }
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Upsert: delete old, save new
    const existingPrefs = existing[0]?.preferences || {};
    const mergedPrefs = { ...defaultPrefs, ...existingPrefs };

    for (const sub of existing) {
      await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
    }

    await base44.asServiceRole.entities.PushSubscription.create({
      user_id: user.id,
      user_email: user.email,
      user_role: userRole,
      subscription,
      preferences: mergedPrefs,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});