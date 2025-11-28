import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get data from request body
        const body = await req.json();
        const { ownerId, action } = body;
        
        if (!ownerId) {
            return Response.json({ error: 'Owner ID required' }, { status: 400 });
        }

        // Get owner's email
        const allUsers = await base44.asServiceRole.entities.User.list();
        const owner = allUsers.find(u => u.id === ownerId);
        
        if (!owner) {
            return Response.json({ error: 'Owner not found' }, { status: 404 });
        }

        if (action === 'load') {
            // Load suppliers and orders
            const [suppliers, orders] = await Promise.all([
                base44.asServiceRole.entities.Supplier.filter({ created_by: owner.email }),
                base44.asServiceRole.entities.Order.filter({ created_by: owner.email }, "-created_date")
            ]);
            
            return Response.json({ 
                suppliers, 
                orders,
                ownerEmail: owner.email 
            });
        }

        if (action === 'createOrder') {
            const order = await base44.asServiceRole.entities.Order.create({
                ...body,
                created_by: owner.email
            });
            return Response.json({ success: true, order });
        }

        if (action === 'createReceipt') {
            const receipt = await base44.asServiceRole.entities.SupplyReceipt.create({
                ...body,
                created_by: owner.email
            });
            return Response.json({ success: true, receipt });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Worker portal error:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});