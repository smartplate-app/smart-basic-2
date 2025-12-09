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
      const ownerEmail = inviter_email || invite.inviter_email;
      
      userData.store_user_role = role || invite.role;
      userData.store_user_owner_email = ownerEmail;
      userData.store_user_store_name = store_name || invite.store_name;
      
      // Get the owner's user record to copy their restaurant details
      const ownerUsers = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
      const owner = ownerUsers && ownerUsers.length > 0 ? ownerUsers[0] : null;
      
      if (owner) {
        // CRITICAL: Set the user to automatically view the restaurant owner's data
        // This makes them see the restaurant's logo, name, suppliers, items, orders
        userData.acting_as_store_email = ownerEmail;
        userData.acting_as_store_name = owner.business_name || invite.restaurant_name || store_name || invite.store_name;
        userData.business_name = owner.business_name || invite.restaurant_name;
        userData.business_address = owner.business_address || invite.restaurant_address || '';
        userData.restaurant_logo = owner.restaurant_logo || '';
        
        // Copy all restaurant branding to the new user
        if (owner.restaurant_phone) userData.restaurant_phone = owner.restaurant_phone;
        if (owner.business_city) userData.business_city = owner.business_city;
      }
    }

    // CRITICAL: First, grant the new user access to this Base44 app
    // This is what allows them to login to the specific restaurant app
    try {
      await base44.asServiceRole.auth.addAppUser(invite.email);
    } catch (accessError) {
      console.log('User may already have app access or error:', accessError);
      // Continue anyway - they might already have access
    }

    // Create user account with restaurant data
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