import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active members
    const members = await base44.asServiceRole.entities.Member.filter({ active: true });
    
    // Collect all unique parent emails
    const allEmails = [];
    members.forEach(member => {
      if (member.parent_one_email) allEmails.push(member.parent_one_email);
      if (member.parent_two_email) allEmails.push(member.parent_two_email);
    });
    
    const uniqueEmails = [...new Set(allEmails)].filter(Boolean);
    
    if (uniqueEmails.length === 0) {
      return Response.json({ message: 'No parent emails to check', updated: 0 });
    }

    // Check registration status for all emails
    const allUsers = await base44.asServiceRole.entities.User.filter({});
    
    // Update cache for each email
    const now = new Date().toISOString();
    let updated = 0;
    
    for (const email of uniqueEmails) {
      const isRegistered = allUsers.some(u => u.email?.toLowerCase() === email.toLowerCase());
      
      // Check if cache record exists
      const existingCache = await base44.asServiceRole.entities.ParentRegistrationCache.filter({ email });
      
      if (existingCache.length > 0) {
        // Update existing record
        await base44.asServiceRole.entities.ParentRegistrationCache.update(existingCache[0].id, {
          is_registered: isRegistered,
          last_checked: now
        });
      } else {
        // Create new record
        await base44.asServiceRole.entities.ParentRegistrationCache.create({
          email,
          is_registered: isRegistered,
          last_checked: now
        });
      }
      updated++;
    }

    return Response.json({ 
      message: 'Registration cache refreshed',
      updated,
      total_emails: uniqueEmails.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});