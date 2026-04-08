import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled function: check for ActionRequired items past their deadline and close them
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const allActions = await base44.asServiceRole.entities.ActionRequired.filter({ is_open: true });

  let closedCount = 0;
  for (const action of allActions) {
    if (action.deadline && new Date(action.deadline) < now) {
      await base44.asServiceRole.entities.ActionRequired.update(action.id, { is_open: false });
      closedCount++;
    }
  }

  return Response.json({ success: true, closedCount });
});