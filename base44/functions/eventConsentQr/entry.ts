import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import QRCode from 'npm:qrcode@1.5.4';

export default async function(req) {
  let links, claimed;
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    links = db.EventConsentLink;
    const input = await req.json();
    const fail = (error, status = 400) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
    const ok = data => Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    const hash = async token => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, '0')).join('');
    let link;
    if (input.operation === 'create') {
      const user = await base44.auth.me();
      if (!user) return fail('Please sign in as a leader.', 401);
      if (!['admin', 'glv', 'leader', 'team_leader'].includes(user.role)) return fail('Leader access required.', 403);
      if (![input.event_id, input.form_id, input.member_id].every(v => typeof v === 'string' && v.length > 0)) return fail('Select an event, form and member.');
      const [event, member, form] = await Promise.all([db.Event.get(input.event_id), db.Member.get(input.member_id), db.ConsentForm.get(input.form_id)]);
      if (!event || !member || !form || form.active === false || !event.consent_form_ids?.includes(form.id)) return fail('This form is not linked to the event.');
      if (!['admin', 'glv'].includes(user.role)) {
        const leaders = await db.Leader.filter({ user_id: user.id });
        if (!leaders.some(l => l.section_ids?.includes(member.section_id) && event.section_ids?.includes(member.section_id))) return fail('You cannot manage consent for this member.', 403);
      }
      const attendance = await db.EventAttendance.filter({ event_id: event.id, member_id: member.id });
      if (!attendance.length) return fail('This member is not listed for the event.');
      const query = { event_id: event.id, member_id: member.id, form_id: form.id };
      const submissions = await db.ConsentFormSubmission.filter(query);
      if (submissions.some(s => ['signed', 'complete'].includes(s.status))) return ok({ completed: true });
      let submission = submissions[0];
      if (!submission) submission = await db.ConsentFormSubmission.create({ ...query, status: 'pending' });
      const existing = await links.filter({ submission_id: submission.id });
      if (existing.some(l => l.state === 'processing')) return fail('A parent is submitting this form. Please wait.', 409);
      const token = crypto.randomUUID() + crypto.randomUUID();
      const payload = { ...query, token_hash: await hash(token), submission_id: submission.id, issued_by: user.id, expires_at: new Date(Date.now() + 86400000).toISOString(), state: 'active' };
      if (existing[0]) {
        const rotated = await links.updateMany({ id: existing[0].id, token_hash: existing[0].token_hash, state: existing[0].state }, { $set: payload });
        if (rotated.updated !== 1) return fail('This QR code changed while it was opening. Please try again.', 409);
      } else {
        await links.create(payload);
      }
      // Use the published host, never a preview/editor host, so another phone can open it.
      const url = 'https://sykescouts.base44.app/consent/event#' + token;
      const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 280 });
      return ok({ token, url, svg, expires_at: payload.expires_at });
    }
    if (!['load', 'status', 'submit'].includes(input.operation)) return fail('Invalid operation.');
    if (typeof input.token !== 'string' || !/^[a-f0-9-]{72}$/.test(input.token)) return fail('Invalid or expired consent link.', 404);
    const found = await links.filter({ token_hash: await hash(input.token) });
    link = found[0];
    if (!link || new Date(link.expires_at).getTime() < Date.now()) return fail('This link has expired. Ask your leader for a new QR code.', 410);
    const [event, form, member, submission, attendance] = await Promise.all([
      db.Event.get(link.event_id), db.ConsentForm.get(link.form_id), db.Member.get(link.member_id),
      db.ConsentFormSubmission.get(link.submission_id), db.EventAttendance.filter({ event_id: link.event_id, member_id: link.member_id })
    ]);
    if (!event?.consent_form_ids?.includes(link.form_id) || !form || form.active === false || !member || !attendance.length || submission?.form_id !== link.form_id || submission?.member_id !== link.member_id || submission?.event_id !== link.event_id) return fail('This consent link is no longer available.', 410);
    const submissions = await db.ConsentFormSubmission.filter({ event_id: link.event_id, form_id: link.form_id, member_id: link.member_id });
    const completed = submissions.some(s => ['signed', 'complete'].includes(s.status));
    if (completed || link.state === 'used') return ok({ completed: true });
    if (input.operation === 'status') return ok({ completed: false });
    if (link.state !== 'active') return fail('This form is currently being submitted. Please wait.', 409);
    if (input.operation === 'load') return ok({ completed: false, member_name: member.full_name || `${member.first_name} ${member.surname}`, event_title: event.title, form: { title: form.title, description: form.description, blocks: form.blocks || [], terms_and_conditions: form.terms_and_conditions || '' } });
    if (typeof input.parent_name !== 'string' || !input.parent_name.trim() || input.parent_name.length > 200) return fail('Enter the name of the parent or guardian signing.');
    if (input.confirm_guardian !== true) return fail('Confirm you are authorised to give consent for this child.');
    if (form.terms_and_conditions && input.tc_accepted !== true) return fail('Accept the terms and conditions.');
    if (!input.responses || typeof input.responses !== 'object' || Array.isArray(input.responses)) return fail('Invalid form responses.');
    const responses = {};
    for (const block of form.blocks || []) {
      if (['heading', 'text'].includes(block.type)) continue;
      const value = input.responses[block.id] ?? '';
      if (typeof value !== 'string' || value.length > 10000) return fail('Invalid response for ' + block.label);
      if (block.required && !value.trim()) return fail('Please complete: ' + block.label);
      if (value && block.type === 'multiple_choice' && !block.options?.includes(value)) return fail('Invalid choice for ' + block.label);
      if (value && block.type === 'number' && (!Number.isFinite(Number(value)) || (block.min != null && Number(value) < block.min) || (block.max != null && Number(value) > block.max))) return fail('Enter a valid number for ' + block.label);
      responses[block.id] = value;
    }
    const signature = input.signature_data_url;
    if (typeof signature !== 'string' || signature.length > 500000 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature)) return fail('Please draw a valid signature.');
    const bytes = Uint8Array.from(atob(signature.split(',')[1]), c => c.charCodeAt(0));
    if (![137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)) return fail('Invalid signature image.');
    const claim = await links.updateMany({ id: link.id, token_hash: link.token_hash, state: 'active' }, { $set: { state: 'processing' } });
    if (claim.updated !== 1) return fail('This consent form is already being submitted.', 409);
    claimed = link;
    const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: new File([bytes], 'consent-signature.png', { type: 'image/png' }) });
    const now = new Date().toISOString();
    // Complete only the actions for this exact form and event, never another event's action.
    const actions = await db.ActionRequired.filter({ consent_form_id: link.form_id, event_id: link.event_id });
    for (const action of actions) {
      const existing = await db.ActionResponse.filter({ action_required_id: action.id, member_id: link.member_id });
      const data = { response_value: 'signed', responded_at: now };
      if (existing[0]) await db.ActionResponse.update(existing[0].id, data);
      else await db.ActionResponse.create({ action_required_id: action.id, member_id: link.member_id, ...data });
    }
    await db.ConsentFormSubmission.update(submission.id, { responses, tc_accepted: input.tc_accepted === true, parent_name: input.parent_name.trim(), signature_file_uri: file_uri, signature_data_url: '', sign_token: '', signed_via_app: false, status: 'signed', submitted_at: now });
    await links.update(link.id, { state: 'used' });
    claimed = null;
    return ok({ completed: true });
  } catch (error) {
    if (claimed && links) await links.updateMany({ id: claimed.id, state: 'processing' }, { $set: { state: 'active' } });
    console.error('Event consent failed:', error.message);
    const status = error.status === 401 || error.status === 403 ? error.status : 500;
    return Response.json({ error: status === 401 ? 'Please sign in as a leader.' : 'Unable to process this consent form. Please try again or ask your leader.' }, { status });
  }
}