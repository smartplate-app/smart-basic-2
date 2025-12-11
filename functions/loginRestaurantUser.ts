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
    const { email, password } = await req.json();
    
    console.log('[loginRestaurantUser] Login attempt for:', email);
    
    if (!email || !password) {
      return Response.json({ 
        success: false, 
        error: 'Email and password required' 
      }, { status: 400 });
    }
    
    // Hash the provided password
    const hashedPassword = await hashPassword(password);
    
    // Find user by email
    const users = await base44.asServiceRole.entities.RestaurantUser.filter({ 
      email: email.toLowerCase(),
      is_active: true
    });
    
    console.log('[loginRestaurantUser] Found users:', users.length);
    
    if (!users || users.length === 0) {
      console.log('[loginRestaurantUser] User not found in RestaurantUser entity');
      return Response.json({ 
        success: false, 
        error: 'Invalid email or password' 
      }, { status: 401 });
    }
    
    const user = users[0];
    console.log('[loginRestaurantUser] User found, checking password...');
    console.log('[loginRestaurantUser] Stored hash:', user.password);
    console.log('[loginRestaurantUser] Provided hash:', hashedPassword);
    
    // Verify password
    if (user.password !== hashedPassword) {
      console.log('[loginRestaurantUser] Password mismatch!');
      return Response.json({ 
        success: false, 
        error: 'Invalid email or password' 
      }, { status: 401 });
    }
    
    // Update last login
    await base44.asServiceRole.entities.RestaurantUser.update(user.id, {
      last_login: new Date().toISOString()
    });
    
    console.log('[loginRestaurantUser] Login successful');
    
    return Response.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        store_id: user.store_id,
        store_name: user.store_name,
        owner_email: user.owner_email
      }
    });
    
  } catch (error) {
    console.error('[loginRestaurantUser] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Login failed' 
    }, { status: 500 });
  }
});