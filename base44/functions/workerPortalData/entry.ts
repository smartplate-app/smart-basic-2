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
            // Also try store_owner_email for chain sub-stores
            const [suppliersByCreated, suppliersByOwner, orders] = await Promise.all([
                base44.asServiceRole.entities.Supplier.filter({ created_by: owner.email }),
                base44.asServiceRole.entities.Supplier.filter({ store_owner_email: owner.email }),
                base44.asServiceRole.entities.Order.filter({ store_owner_email: owner.email }, "-created_date")
            ]);
            // Merge and deduplicate suppliers
            const allSuppliers = [...suppliersByCreated, ...suppliersByOwner];
            const seen = new Set();
            const suppliers = allSuppliers.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
            
            return Response.json({ 
                suppliers, 
                orders,
                ownerEmail: owner.email,
                businessName: owner.business_name || owner.full_name || ''
            });
        }

        if (action === 'createOrder') {
            const order = await base44.asServiceRole.entities.Order.create({
                ...body,
                created_by: owner.email,
                store_owner_email: owner.email
            });
            return Response.json({ success: true, order });
        }

        if (action === 'createReceipt') {
            const receipt = await base44.asServiceRole.entities.SupplyReceipt.create({
                ...body,
                created_by: owner.email,
                store_owner_email: owner.email
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