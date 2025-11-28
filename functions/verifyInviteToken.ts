import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ 
        success: false, 
        error: 'Token is required' 
      }, { status: 400 });
    }

    // Find invite by token using service role
    const invites = await base44.asServiceRole.entities.UserInvite.filter({ token });

    if (!invites || invites.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid invite token' 
      }, { status: 404 });
    }

    const invite = invites[0];

    // Check if already used
    if (invite.used) {
      return Response.json({ 
        success: false, 
        error: 'This invite has already been used' 
      }, { status: 400 });
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return Response.json({ 
        success: false, 
        error: 'This invite has expired' 
      }, { status: 400 });
    }

    return Response.json({ 
      success: true,
      invite: {
        email: invite.email,
        full_name: invite.full_name,
        suggested_username: invite.suggested_username
      }
    });

  } catch (error) {
    console.error('Error verifying invite:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to verify invite'
    }, { status: 500 });
  }
});