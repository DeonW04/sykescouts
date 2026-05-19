import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({});
  const session = sessions[0];

  if (!session) return Response.json({ configured: false });

  return Response.json({
    configured: !!session.auth_state,
    status: session.status,
    phone_number: session.phone_number,
    last_connected: session.last_connected,
    last_poll: session.last_poll,
    last_poll_error: session.last_poll_error
  });
});