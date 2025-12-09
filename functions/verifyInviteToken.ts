import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    console.log('[verifyInviteToken] Looking for token:', token);

    // Use service role to check invite without requiring authentication
    const invites = await base44.asServiceRole.entities.UserInvite.filter({ 
      token: token 
    });

    if (!invites || invites.length === 0) {
      console.log('[verifyInviteToken] Token not found');
      return Response.json({ 
        success: false, 
        error: 'Invalid invitation token' 
      }, { status: 404 });
    }

    const invite = invites[0];
    console.log('[verifyInviteToken] Found invite for:', invite.email);

    // Check if already used
    if (invite.used) {
      console.log('[verifyInviteToken] Token already used');
      return Response.json({ 
        success: false, 
        error: 'This invitation has already been used' 
      }, { status: 400 });
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      console.log('[verifyInviteToken] Token expired');
      return Response.json({ 
        success: false, 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    console.log('[verifyInviteToken] Token is valid');

    return Response.json({ 
      success: true,
      invite: {
        email: invite.email,
        full_name: invite.full_name,
        phone: invite.phone,
        invite_type: invite.invite_type,
        chain_id: invite.chain_id,
        chain_name: invite.chain_name,
        store_id: invite.store_id,
        store_name: invite.store_name,
        role: invite.role,
        inviter_email: invite.inviter_email,
        inviter_name: invite.inviter_name,
        restaurant_name: invite.restaurant_name,
        restaurant_address: invite.restaurant_address
      }
    });

  } catch (error) {
    console.error('[verifyInviteToken] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to verify invitation'
    }, { status: 500 });
  }
});