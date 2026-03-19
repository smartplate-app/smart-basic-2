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
    const { invite_token, username, password, invite_type, chain_id, store_id, store_name, role, inviter_email, oauth_user_email } = await req.json();

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

    // Check if this is OAuth flow (user already authenticated)
    let existingUser = null;
    if (oauth_user_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: oauth_user_email });
      existingUser = users && users.length > 0 ? users[0] : null;
      console.log('[completeSignup] OAuth flow - found existing user:', !!existingUser);
    }

    // Check if username already exists (skip if OAuth and user exists)
    if (!existingUser) {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ username });
      if (existingUsers && existingUsers.length > 0) {
        return Response.json({ 
          success: false, 
          error: 'Username already taken' 
        }, { status: 400 });
      }
    }

    // Hash password (only needed for non-OAuth flow)
    const hashedPassword = existingUser ? null : await hashPassword(password);

    // Build user data based on invite type
    const userData = {
      email: invite.email,
      full_name: invite.full_name,
      phone: invite.phone || '',
      role: 'user'
    };

    // Add username and password only for new users (not OAuth)
    if (!existingUser) {
      userData.username = username.trim();
      userData.password = hashedPassword;
    }

    // Add chain/store specific data based on invite type
    const inviteTypeToUse = invite_type || invite.invite_type;
    
    if (inviteTypeToUse === 'chain_store') {
      // Chain store manager - gets their own store in the chain
      userData.chain_id = chain_id || invite.chain_id;
      userData.is_chain_head = false;
    } else if (inviteTypeToUse === 'store_user') {
      // Store user (worker/manager) - works within someone else's store
      const ownerEmail = inviter_email || invite.inviter_email;
      
      console.log('[completeSignup] Processing store_user invite for owner:', ownerEmail);
      
      // Get the owner's user record to copy their restaurant details
      const ownerUsers = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
      const owner = ownerUsers && ownerUsers.length > 0 ? ownerUsers[0] : null;
      
      if (!owner) {
        console.error('[completeSignup] Owner not found:', ownerEmail);
        throw new Error('Restaurant owner not found. Please contact support.');
      }
      
      console.log('[completeSignup] Found owner:', owner.full_name);
      
      // CRITICAL: Store user joins the owner's restaurant
      // We DON'T set restaurant data on the User entity permanently
      // This allows them to still own their own restaurant if they have one
      userData.store_user_role = role || invite.role;
      userData.store_user_owner_email = ownerEmail;
      userData.store_user_store_name = owner.business_name || invite.restaurant_name || store_name || invite.store_name;
      
      // We'll set acting_as_store_email temporarily after user logs in
      // This allows UserSwitcher to manage switching between restaurants
      console.log('[completeSignup] User will join restaurant:', owner.business_name);
    }

    // Create or update user account with restaurant data
    if (existingUser) {
      console.log('[completeSignup] Updating existing OAuth user:', existingUser.id);
      await base44.asServiceRole.entities.User.update(existingUser.id, userData);
    } else {
      console.log('[completeSignup] Creating new user account');
      await base44.asServiceRole.entities.User.create(userData);
      
      // CRITICAL: Grant the new user access to this Base44 app
      // This must happen AFTER creating the User entity
      try {
        await base44.asServiceRole.auth.addAppUser(invite.email);
        console.log('[completeSignup] Successfully added app access for:', invite.email);
      } catch (accessError) {
        console.error('[completeSignup] Failed to add app access:', accessError);
        // This is critical - if it fails, the user won't be able to login
        throw new Error('Failed to grant app access. Please contact support.');
      }
    }

    // If this is a store_user invite, create StoreUser record
    if (inviteTypeToUse === 'store_user') {
      const ownerEmail = inviter_email || invite.inviter_email;
      
      await base44.asServiceRole.entities.StoreUser.create({
        store_id: store_id || invite.store_id || '',
        store_name: store_name || invite.store_name || '',
        user_email: invite.email,
        user_name: invite.full_name,
        role: role || invite.role || 'worker',
        owner_email: ownerEmail,
        is_active: true
      });
      
      // Get owner's data to set temporary acting_as context
      const ownerUsers = await base44.asServiceRole.entities.User.filter({ email: ownerEmail });
      const owner = ownerUsers && ownerUsers.length > 0 ? ownerUsers[0] : null;
      
      if (owner) {
        // Set temporary context to view this restaurant's data
        // User can switch back to their own restaurant via UserSwitcher
        const userId = existingUser ? existingUser.id : (await base44.asServiceRole.entities.User.filter({ email: invite.email }))[0].id;
        
        await base44.asServiceRole.entities.User.update(userId, {
          acting_as_store_email: ownerEmail,
          acting_as_store_name: owner.business_name || invite.restaurant_name || store_name || invite.store_name
        });
        
        console.log('[completeSignup] Set temporary acting_as context for restaurant:', owner.business_name);
      }
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