import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify the requesting user is an admin
    const requestingUser = await base44.auth.me();
    if (!requestingUser || requestingUser.role !== 'admin') {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized. Only admins can create invites.' 
      }, { status: 403 });
    }

    const { email, full_name, phone } = await req.json();

    if (!email || !full_name) {
      return Response.json({ 
        success: false, 
        error: 'email and full_name are required' 
      }, { status: 400 });
    }

    // Generate random token
    const token = crypto.randomUUID();
    
    // Generate suggested username
    const suggestedUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Store invite in database with expiry (24 hours)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    await base44.asServiceRole.entities.UserInvite.create({
      token,
      email,
      full_name,
      phone: phone || '',
      suggested_username: suggestedUsername,
      expires_at: expiryDate.toISOString(),
      created_by: requestingUser.email,
      used: false
    });

    return Response.json({ 
      success: true,
      token,
      message: 'Invite created successfully'
    });

  } catch (error) {
    console.error('Error creating invite:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create invite'
    }, { status: 500 });
  }
});