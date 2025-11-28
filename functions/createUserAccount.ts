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
        
        const body = await req.json();
        const { email, full_name, username, password, phone } = body;

        if (!email || !full_name || !username || !password) {
            return Response.json({ 
                success: false,
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        // Verify admin is logged in
        const admin = await base44.auth.me();
        if (!admin || admin.role !== 'admin') {
            return Response.json({ 
                success: false,
                error: 'Unauthorized - Admin access required' 
            }, { status: 401 });
        }

        // Check if email already exists
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
        if (existingUsers && existingUsers.length > 0) {
            return Response.json({ 
                success: false,
                error: 'User with this email already exists'
            }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user - base44 will handle username/password through updateMe or custom fields
        const newUser = await base44.asServiceRole.entities.User.create({
            email: email,
            full_name: full_name,
            phone: phone || '',
            role: 'user',
            username: username,
            password: hashedPassword
        });

        return Response.json({
            success: true,
            user: {
                id: newUser.id,
                email: newUser.email,
                full_name: newUser.full_name,
                username: username
            }
        });

    } catch (error) {
        console.error('Error in createUserAccount:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Failed to create user account'
        }, { status: 500 });
    }
});