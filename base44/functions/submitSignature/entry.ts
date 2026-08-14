import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, signature_data_url, parent_name } = await req.json();

    if (!token || !signature_data_url) {
      return Response.json({ error: 'Missing token or signature' }, { status: 400 });
    }

    // Find submission by sign_token using service role
    const submissions = await base44.asServiceRole.entities.ConsentFormSubmission.list();
    const submission = submissions.find(s => s.sign_token === token);

    if (!submission) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    await base44.asServiceRole.entities.ConsentFormSubmission.update(submission.id, {
      signature_data_url,
      parent_name: parent_name || submission.parent_name,
      status: 'signed',
      submitted_at: new Date().toISOString(),
    });

    // Mark the linked ActionRequired as responded so it disappears from the
    // parent's Action Required list (mirrors the in-app signing flow).
    const linkedActions = await base44.asServiceRole.entities.ActionRequired.filter({ consent_form_id: submission.form_id });
    const action = linkedActions.find(a =>
      (submission.event_id && a.event_id === submission.event_id) ||
      (submission.programme_id && a.programme_id === submission.programme_id)
    ) || linkedActions[0];

    if (action) {
      const existingResponses = await base44.asServiceRole.entities.ActionResponse.filter({
        action_required_id: action.id,
        member_id: submission.member_id,
      });
      if (existingResponses.length > 0) {
        await base44.asServiceRole.entities.ActionResponse.update(existingResponses[0].id, {
          response_value: 'signed',
          responded_at: new Date().toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.ActionResponse.create({
          action_required_id: action.id,
          member_id: submission.member_id,
          response_value: 'signed',
          responded_at: new Date().toISOString(),
        });
      }
    }

    return Response.json({ success: true, submission_id: submission.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});