import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const body = await req.json();
    // Trim inputs: mobile keyboards / autofill often add a trailing space,
    // and passwords are saved trimmed (see StoreUsers.jsx), so compare trimmed.
    const username = (body.username || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const password = (body.password || '').toString().trim();
    // Optional: the restaurant the login link belongs to (?owner= in the link)
    const ownerId = (body.owner || body.store_id || '').toString().trim();
    
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
        const allUsers = await base44.asServiceRole.entities.RestaurantUser.filter({ is_active: true });
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
    
    // Find the one with matching password. If the link carries the restaurant
    // id, prefer the account that belongs to that restaurant.
    const matching = users.filter(u => u.password === hashedPassword);
    const user = (ownerId && matching.find(u => u.store_id === ownerId)) || matching[0];
    
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
    
    console.log('[loginRestaurantUser] Login successful, issuing login token for:', user.email);

    // Credentials are valid — return user info. 
    // The frontend will use loginViaEmailPassword with their worker email.
    // We return the mapped email so the frontend can call auth directly.
    
    return Response.json({ 
      success: true,
      worker_email: user.email,
      worker_password: password, // raw password — frontend will use to call loginViaEmailPassword

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