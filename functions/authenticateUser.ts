import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Use Web Crypto API for password hashing
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
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ 
        success: false, 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    // Find user by username using service role
    const users = await base44.asServiceRole.entities.User.filter({ username: username.trim() });

    if (!users || users.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Invalid username or password' 
      }, { status: 401 });
    }

    const user = users[0];

    // Hash the provided password and compare
    const hashedPassword = await hashPassword(password);

    if (user.password !== hashedPassword) {
      return Response.json({ 
        success: false, 
        error: 'Invalid username or password' 
      }, { status: 401 });
    }

    // Generate a simple token (you can make this more secure if needed)
    const token = btoa(JSON.stringify({ 
      userId: user.id, 
      email: user.email,
      timestamp: Date.now() 
    }));

    return Response.json({ 
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error authenticating user:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Authentication failed'
    }, { status: 500 });
  }
});