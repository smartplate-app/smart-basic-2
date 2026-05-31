import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

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
    const { username, password, email } = await req.json();
    
    console.log('[loginRestaurantUser] Login attempt for:', username || email);
    
    if ((!username && !email) || !password) {
      return Response.json({ 
        success: false, 
        error: 'Username/Email and password required' 
      }, { status: 400 });
    }
    
    const hashedPassword = await hashPassword(password);
    
    // Find user by email or by email starting with username@
    let users = [];
    if (email) {
        users = await base44.asServiceRole.entities.RestaurantUser.filter({ 
          email: email.toLowerCase(),
          is_active: true
        });
    } else if (username) {
        // Filter in memory since we can't easily query "startsWith" or regex directly in filter sometimes
        const allUsers = await base44.asServiceRole.entities.RestaurantUser.filter({ is_active: true }, undefined, 10000);
        const uname = username.toLowerCase().trim();
        users = allUsers.filter(u => u.email === uname || u.email.startsWith(uname + '@'));
    }
    
    console.log('[loginRestaurantUser] Found users:', users.length);
    
    if (!users || users.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid username or password' 
      }, { status: 401 });
    }
    
    // Find the one with matching password
    const user = users.find(u => u.password === hashedPassword);
    
    if (!user) {
      console.log('[loginRestaurantUser] Password mismatch!');
      return Response.json({ 
        success: false, 
        error: 'Invalid username or password' 
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
        email: user.email, // This is the important part: returning the constructed email
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