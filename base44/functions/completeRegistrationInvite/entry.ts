import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called after the parent has verified OTP and is authenticated.
// Links the new user to the child member and marks the invite completed.
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

    const invites = await base44.asServiceRole.entities.RegistrationInvite.filter({ token });
    const invite = invites[0];
    if (!invite) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }
    if (invite.status === 'completed') {
      return Response.json({ success: true, alreadyCompleted: true });
    }

    // Security: the authenticated user's email must match the invited email
    if (user.email.toLowerCase() !== invite.parent_email.toLowerCase()) {
      return Response.json({ error: 'Email mismatch' }, { status: 403 });
    }

    const members = await base44.asServiceRole.entities.Member.filter({ id: invite.member_id });
    const member = members[0];
    if (member) {
      // Ensure the parent email is set on the correct slot so the parent portal links up
      const updates = {};
      const slot = invite.parent_slot || 'parent_one';
      if (slot === 'parent_two') {
        if (!member.parent_two_email) updates.parent_two_email = invite.parent_email;
      } else {
        if (!member.parent_one_email) updates.parent_one_email = invite.parent_email;
      }
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Member.update(member.id, updates);
      }

      // Create a Parent record if one doesn't exist yet
      const existingParent = await base44.asServiceRole.entities.Parent.filter({ user_id: user.id });
      if (existingParent.length === 0) {
        await base44.asServiceRole.entities.Parent.create({ user_id: user.id });
      }
    }

    await base44.asServiceRole.entities.RegistrationInvite.update(invite.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('completeRegistrationInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});