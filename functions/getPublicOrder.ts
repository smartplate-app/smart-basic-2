import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return Response.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // Use service role to fetch order (bypasses user auth)
        const base44 = createClientFromRequest(req);
        const order = await base44.asServiceRole.entities.Order.get(orderId);

        if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        return Response.json({ order });
    } catch (error) {
        console.error('Error fetching public order:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});