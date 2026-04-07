import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    return Response.json({ publicKey: VAPID_PUBLIC_KEY });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});