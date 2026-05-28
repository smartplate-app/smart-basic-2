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
    
    // Verify requester is authenticated
    const requester = await base44.auth.me();
    if (!requester) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { email, password, full_name, phone, store_name, role, owner_email } = await req.json();
    
    console.log('[createRestaurantUser] Creating user:', email);
    
    if (!email || !password || !full_name || !role) {
      return Response.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    if (password.length < 6) {
      return Response.json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.RestaurantUser.filter({ 
      email: email.toLowerCase() 
    });
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    let newUser;
    if (existingUsers && existingUsers.length > 0) {
      // Update existing user instead of failing (allows password/name updates)
      newUser = await base44.asServiceRole.entities.RestaurantUser.update(existingUsers[0].id, {
        password: hashedPassword,
        full_name: full_name,
        role: role,
        is_active: true
      });
    } else {
      // Create user
      newUser = await base44.asServiceRole.entities.RestaurantUser.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name: full_name,
        phone: phone || '',
        store_id: requester.id,
        store_name: store_name || requester.business_name,
        owner_email: owner_email || requester.email,
        role: role,
        is_active: true
      });
    }
    
    console.log('[createRestaurantUser] User created successfully:', newUser.id);
    
    // Check if StoreUser record already exists
    const existingStoreUsers = await base44.asServiceRole.entities.StoreUser.filter({ 
      user_email: email.toLowerCase() 
    });

    if (existingStoreUsers && existingStoreUsers.length > 0) {
      const storeUser = existingStoreUsers[0];
      await base44.asServiceRole.entities.StoreUser.update(storeUser.id, {
        user_name: full_name,
        role: role,
        is_active: true
      });
    } else {
      // Also create StoreUser record for compatibility
      await base44.asServiceRole.entities.StoreUser.create({
        store_id: requester.id,
        store_name: store_name || requester.business_name,
        user_email: email.toLowerCase(),
        user_name: full_name,
        role: role,
        owner_email: owner_email || requester.email,
        is_active: true
      });
    }
    
    return Response.json({ 
      success: true,
      user_id: newUser.id
    });
    
  } catch (error) {
    console.error('[createRestaurantUser] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create user' 
    }, { status: 500 });
  }
});