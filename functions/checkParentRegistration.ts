import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate the user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the emails to check from the request
    const { emails } = await req.json();
    
    if (!emails || !Array.isArray(emails)) {
      return Response.json({ error: 'Invalid request: emails array required' }, { status: 400 });
    }

    // Use service role to check if users exist
    const results = {};
    
    for (const email of emails) {
      if (email) {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        results[email] = users.length > 0;
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});