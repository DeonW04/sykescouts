import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { auth_state, phone_number } = await req.json();
  if (!auth_state) return Response.json({ error: 'auth_state is required' }, { status: 400 });

  // Validate JSON
  try { JSON.parse(auth_state); } catch {
    return Response.json({ error: 'auth_state must be valid JSON' }, { status: 400 });
  }

  const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({});
  const payload = { auth_state, phone_number: phone_number || '', status: 'connected', last_connected: new Date().toISOString() };

  if (sessions[0]) {
    await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, payload);
  } else {
    await base44.asServiceRole.entities.WhatsAppSession.create(payload);
  }

  return Response.json({ success: true });
});