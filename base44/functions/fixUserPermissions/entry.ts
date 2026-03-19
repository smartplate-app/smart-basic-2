import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin authentication
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized - Admin access required' 
            }, { status: 403 });
        }

        // Get the user email to fix
        const { userEmail } = await req.json();
        
        if (!userEmail) {
            return Response.json({ 
                success: false, 
                error: 'userEmail is required' 
            }, { status: 400 });
        }

        // Get all users to find the target user
        const users = await base44.asServiceRole.entities.User.list();
        const targetUser = users.find(u => u.email === userEmail);
        
        if (!targetUser) {
            return Response.json({ 
                success: false, 
                error: 'User not found' 
            }, { status: 404 });
        }

        // Clear the problematic store_user fields
        await base44.asServiceRole.entities.User.update(targetUser.id, {
            store_user_role: null,
            store_user_owner_email: null,
            store_user_store_name: null,
            store_user_revoked: null
        });

        return Response.json({ 
            success: true, 
            message: 'User permissions cleared successfully',
            clearedFields: ['store_user_role', 'store_user_owner_email', 'store_user_store_name', 'store_user_revoked']
        });

    } catch (error) {
        console.error('Error fixing user permissions:', error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Failed to fix permissions' 
        }, { status: 500 });
    }
});