import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

// Called right after the invited user verifies their email and is authenticated.
// Applies the invited role / account type and (optionally) creates a Leader record.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    const invites = await base44.asServiceRole.entities.UserInvite.filter({ token });
    const invite = invites[0];
    if (!invite) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.status === 'completed') {
      return Response.json({ success: true, message: 'Already completed' });
    }
    // Ensure the invite email matches the authenticated user
    if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ error: 'Invite email mismatch' }, { status: 403 });
    }

    // Apply role + account type
    const updateData = {};
    if (invite.role) updateData.role = invite.role;
    if (invite.account_type) updateData.account_type = invite.account_type;
    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updateData);
    }

    // Create a Leader record if requested and one doesn't already exist
    if (invite.make_leader) {
      const existingLeaders = await base44.asServiceRole.entities.Leader.filter({ user_id: user.id });
      if (existingLeaders.length === 0) {
        await base44.asServiceRole.entities.Leader.create({
          user_id: user.id,
          phone: '',
          display_name: user.full_name || '',
          section_ids: [],
        });
      }
    }

    await base44.asServiceRole.entities.UserInvite.update(invite.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    return Response.json({ success: true, role: invite.role, account_type: invite.account_type });
  } catch (error) {
    console.error('completeUserInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});