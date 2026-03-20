import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, full_name, display_name, role, default_section_id } = await req.json();

    const updateData = { role };
    if (full_name !== undefined) updateData.full_name = full_name;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (default_section_id !== undefined) updateData.default_section_id = default_section_id;

    await base44.asServiceRole.entities.User.update(userId, updateData);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in updateUser function:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});