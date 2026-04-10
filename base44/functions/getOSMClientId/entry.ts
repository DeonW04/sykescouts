import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('OSM_CLIENT_ID');
    if (!clientId) {
      return Response.json({ error: 'OSM_CLIENT_ID not configured in secrets' }, { status: 500 });
    }
    return Response.json({ client_id: clientId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});