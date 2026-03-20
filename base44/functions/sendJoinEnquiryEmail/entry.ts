import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { registrationId } = await req.json();
    
    if (!registrationId) {
      return Response.json({ error: 'Registration ID required' }, { status: 400 });
    }
    
    // Get registration details
    const registration = await base44.asServiceRole.entities.ChildRegistration.filter({ id: registrationId });
    if (!registration || registration.length === 0) {
      return Response.json({ error: 'Registration not found' }, { status: 404 });
    }
    
    const reg = registration[0];
    
    // Get all leaders
    const leaders = await base44.asServiceRole.entities.Leader.filter({});
    const users = await base44.asServiceRole.entities.User.list();
    
    // Get leader emails
    const leaderEmails = leaders
      .map(leader => {
        const user = users.find(u => u.id === leader.user_id);
        return user?.email;
      })
      .filter(Boolean);
    
    if (leaderEmails.length === 0) {
      return Response.json({ error: 'No leader emails found' }, { status: 400 });
    }
    
    // Send email to each leader
    for (const email of leaderEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `New Join Enquiry: ${reg.child_name}`,
        body: `A new registration has been submitted:

Child Name: ${reg.child_name}
Date of Birth: ${new Date(reg.date_of_birth).toLocaleDateString()}
Section Interest: ${reg.section_interest}

Parent/Guardian: ${reg.parent_name}
Email: ${reg.email}
Phone: ${reg.phone}

${reg.address ? `Address: ${reg.address}` : ''}
${reg.medical_info ? `Medical Info: ${reg.medical_info}` : ''}
${reg.additional_info ? `Additional Info: ${reg.additional_info}` : ''}

Photo Consent: ${reg.consent_photos ? 'Yes' : 'No'}

Please review this enquiry in the Join Enquiries page.`
      });
    }
    
    return Response.json({ success: true, emailsSent: leaderEmails.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});