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
    
    // Verify the requester is authenticated
    const requester = await base44.auth.me();
    if (!requester) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password, email, full_name, restaurant_name, restaurant_address, role, owner_email } = await req.json();

    if (!username || !password || !email || !full_name) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createSimpleUserAccount] Creating account for:', email);

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user account using service role
    const newUser = await base44.asServiceRole.auth.createUser({
      email: email,
      password: password,
      username: username,
      user_metadata: {
        full_name: full_name,
        business_name: restaurant_name,
        business_address: restaurant_address,
        store_user_role: role,
        store_user_owner_email: owner_email
      }
    });

    console.log('[createSimpleUserAccount] User created successfully:', newUser.id);

    return Response.json({ 
      success: true, 
      user_id: newUser.id,
      username: username
    });

  } catch (error) {
    console.error('[createSimpleUserAccount] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create account' 
    }, { status: 500 });
  }
});