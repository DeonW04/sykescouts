import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this function
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();

    // Update each user to set onboarding_complete to false
    let updated = 0;
    for (const u of users) {
      await base44.asServiceRole.entities.User.update(u.id, {
        onboarding_complete: false
      });
      updated++;
    }

    return Response.json({ 
      success: true, 
      message: `Updated ${updated} users. All users must now complete onboarding.`,
      updated_count: updated 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});