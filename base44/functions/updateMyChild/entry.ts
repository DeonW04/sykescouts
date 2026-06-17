import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Fields a parent is allowed to edit on their own child.
// Email fields are deliberately excluded — only leaders may change those.
const EDITABLE_FIELDS = new Set([
  'preferred_name', 'address',
  'doctors_surgery', 'doctors_surgery_address', 'doctors_phone',
  'medical_info', 'allergies', 'dietary_requirements', 'medications',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  'parent_one_name', 'parent_one_phone', 'parent_two_name', 'parent_two_phone',
  'photo_consent',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId, data } = await req.json();
    if (!memberId || !data) {
      return Response.json({ error: 'memberId and data are required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Verify this member belongs to the authenticated parent.
    const member = await svc.entities.Member.get(memberId).catch(() => null);
    if (!member) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const isOwner = member.parent_one_email === user.email || member.parent_two_email === user.email;
    if (!isOwner) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Whitelist the fields being written.
    const clean = {};
    for (const [k, v] of Object.entries(data)) {
      if (EDITABLE_FIELDS.has(k)) clean[k] = v;
    }

    await svc.entities.Member.update(memberId, clean);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});