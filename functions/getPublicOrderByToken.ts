import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { token } = await req.json();

        if (!token) {
            return Response.json({ error: 'Token required' }, { status: 400 });
        }

        // Use service role to access data without authentication
        const tokens = await base44.asServiceRole.entities.OrderShareToken.filter({ token: token });

        if (tokens.length === 0) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        const tokenData = tokens[0];

        // Check if expired
        if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            return Response.json({ error: 'Link expired' }, { status: 410 });
        }

        // Increment view count
        await base44.asServiceRole.entities.OrderShareToken.update(tokenData.id, {
            view_count: (tokenData.view_count || 0) + 1
        });

        return Response.json({ 
            success: true, 
            order: tokenData.order_data 
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});