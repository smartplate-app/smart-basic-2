import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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
    const { invite_token, username, password } = await req.json();

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

    // Create user account with hashed password
    await base44.asServiceRole.entities.User.create({
      email: invite.email,
      full_name: invite.full_name,
      username: username.trim(),
      password: hashedPassword,
      phone: invite.phone || '',
      role: 'user'
    });

    // Mark invite as used
    await base44.asServiceRole.entities.UserInvite.update(invite.id, {
      used: true,
      used_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Error completing signup:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create account'
    }, { status: 500 });
  }
});