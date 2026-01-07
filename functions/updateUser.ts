import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, full_name, role } = await req.json();

    // Use service role to update user (email cannot be changed)
    await base44.asServiceRole.entities.User.update(userId, {
      full_name,
      role,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error in updateUser function:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});