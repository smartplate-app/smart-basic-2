import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Use Web Crypto API for password hashing (built-in to Deno)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { invite_token, username, password, invite_type, chain_id, store_id, store_name, role, inviter_email } = await req.json();

    if (!invite_token || !username || !password) {
      return Response.json({ 
        success: false, 
        error: 'invite_token, username, and password are required' 
      }, { status: 400 });
    }

    // Verify invite token
    const invites = await base44.asServiceRole.entities.UserInvite.filter({ token: invite_token });
    
    if (!invites || invites.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid invite token' 
      }, { status: 404 });
    }

    const invite = invites[0];

    if (invite.used) {
      return Response.json({ 
        success: false, 
        error: 'This invite has already been used' 
      }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return Response.json({ 
        success: false, 
        error: 'This invite has expired' 
      }, { status: 400 });
    }

    // Check if username already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ username });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ 
        success: false, 
        error: 'Username already taken' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Build user data based on invite type
    const userData = {
      email: invite.email,
      full_name: invite.full_name,
      username: username.trim(),
      password: hashedPassword,
      phone: invite.phone || '',
      role: 'user'
    };

    // Add chain/store specific data based on invite type
    const inviteTypeToUse = invite_type || invite.invite_type;
    
    if (inviteTypeToUse === 'chain_store') {
      // Chain store manager - gets their own store in the chain
      userData.chain_id = chain_id || invite.chain_id;
      userData.is_chain_head = false;
    } else if (inviteTypeToUse === 'store_user') {
      // Store user (worker/manager) - works within someone else's store
      userData.store_user_role = role || invite.role;
      userData.store_user_owner_email = inviter_email || invite.inviter_email;
      userData.store_user_store_name = store_name || invite.store_name;
    }

    // Create user account
    await base44.asServiceRole.entities.User.create(userData);

    // If this is a store_user invite, also create StoreUser record
    if (inviteTypeToUse === 'store_user') {
      await base44.asServiceRole.entities.StoreUser.create({
        store_id: store_id || invite.store_id || '',
        store_name: store_name || invite.store_name || '',
        user_email: invite.email,
        user_name: invite.full_name,
        role: role || invite.role || 'worker',
        owner_email: inviter_email || invite.inviter_email || '',
        is_active: true
      });
    }

    // Mark invite as used
    await base44.asServiceRole.entities.UserInvite.update(invite.id, {
      used: true,
      used_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      message: 'Account created successfully',
      invite_type: inviteTypeToUse
    });

  } catch (error) {
    console.error('Error completing signup:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create account'
    }, { status: 500 });
  }
});