import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { parent_name, parent_email, parent_phone, child_name, child_dob } = await req.json();

    // Generate unique token
    const inviteToken = crypto.randomUUID();

    // Create invitation record
    const invitation = await base44.asServiceRole.entities.MemberInvitation.create({
      parent_name,
      parent_email,
      parent_phone,
      child_name,
      child_dob,
      status: 'pending',
      invited_by: user.id,
      invite_token: inviteToken,
    });

    // Get app URL
    const appUrl = Deno.env.get('APP_URL') || 'https://your-app.base44.app';
    const inviteUrl = `${appUrl}/complete-registration?token=${inviteToken}`;

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: parent_email,
      subject: '40th Rochdale Scouts - Complete Your Child\'s Registration',
      body: `Dear ${parent_name},

You've been invited to complete the registration for ${child_name} with 40th Rochdale (Syke) Scouts!

To complete the registration, please:
1. Click the link below
2. Create your parent account (or sign in if you already have one)
3. Fill in the complete details for ${child_name}

Complete Registration: ${inviteUrl}

This invitation will expire in 7 days.

If you have any questions, please don't hesitate to contact us.

Best regards,
40th Rochdale (Syke) Scouts`,
    });

    return Response.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation_id: invitation.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});