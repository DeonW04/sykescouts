import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public endpoint — validates a registration token and returns invite details
// so the register page can pre-fill / lock the parent email.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();
    if (!token) {
      return Response.json({ valid: false, reason: 'missing_token' }, { status: 400 });
    }

    const invites = await base44.asServiceRole.entities.RegistrationInvite.filter({ token });
    const invite = invites[0];

    if (!invite) {
      return Response.json({ valid: false, reason: 'not_found' });
    }
    if (invite.status === 'completed') {
      return Response.json({ valid: false, reason: 'already_used', parent_email: invite.parent_email });
    }
    if (invite.status === 'expired' || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
      return Response.json({ valid: false, reason: 'expired' });
    }

    return Response.json({
      valid: true,
      parent_email: invite.parent_email,
      parent_name: invite.parent_name,
      child_name: invite.child_name,
    });
  } catch (error) {
    return Response.json({ valid: false, reason: 'error', error: error.message }, { status: 500 });
  }
});