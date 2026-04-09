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

    return Response.json({ success: true, submission_id: submission.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});