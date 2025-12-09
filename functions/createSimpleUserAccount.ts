import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
    const { email, full_name, username, password, restaurant_data } = await req.json();

    if (!email || !username || !password || !restaurant_data) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check if username exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ username });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ 
        success: false, 
        error: 'Username already taken' 
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // CRITICAL: Grant app access first
    try {
      await base44.asServiceRole.auth.addAppUser(email);
    } catch (accessError) {
      console.log('User may already have app access:', accessError);
    }

    // Create user with restaurant data
    const userData = {
      email,
      full_name,
      username: username.trim(),
      password: hashedPassword,
      role: 'user',
      ...restaurant_data
    };

    await base44.asServiceRole.entities.User.create(userData);

    // Create StoreUser record
    await base44.asServiceRole.entities.StoreUser.create({
      store_id: restaurant_data.store_user_owner_email,
      store_name: restaurant_data.store_user_store_name,
      user_email: email,
      user_name: full_name,
      role: restaurant_data.store_user_role,
      owner_email: restaurant_data.store_user_owner_email,
      is_active: true
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Error creating user account:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create account'
    }, { status: 500 });
  }
});