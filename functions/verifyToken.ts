import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ 
                success: false,
                error: 'Token required' 
            }, { status: 400 });
        }

        // Decode token
        const decoded = JSON.parse(atob(token));
        
        // Check if token is not too old (24 hours)
        const tokenAge = Date.now() - decoded.timestamp;
        if (tokenAge > 24 * 60 * 60 * 1000) {
            return Response.json({ 
                success: false,
                error: 'Token expired'
            }, { status: 401 });
        }

        // Get user data
        const user = await base44.asServiceRole.entities.User.get(decoded.userId);

        if (!user) {
            return Response.json({ 
                success: false,
                error: 'User not found'
            }, { status: 401 });
        }

        return Response.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role || 'user',
                phone: user.phone,
                business_name: user.business_name,
                business_address: user.business_address
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);
        return Response.json({ 
            success: false,
            error: 'Invalid token'
        }, { status: 401 });
    }
});