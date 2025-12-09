import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin
        const admin = await base44.auth.me();
        if (!admin || admin.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
        }

        const { userEmail } = await req.json();
        
        if (!userEmail) {
            return Response.json({ error: 'Missing userEmail' }, { status: 400 });
        }

        // Get the user record
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const userId = users[0].id;

        // Clear the store_user fields that are blocking permissions
        await base44.asServiceRole.entities.User.update(userId, {
            store_user_role: null,
            store_user_owner_email: null,
            store_user_store_name: null,
            store_user_revoked: null
        });

        return Response.json({ 
            success: true, 
            message: `Cleared store_user fields for ${userEmail}`,
            userId 
        });

    } catch (error) {
        console.error("Error fixing user permissions:", error);
        return Response.json({ 
            error: error.message || 'Failed to fix user permissions' 
        }, { status: 500 });
    }
});