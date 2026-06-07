import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get data from request body
        const body = await req.json();
        const { ownerId, action } = body;
        
        if (!ownerId) {
            return Response.json({ error: 'Owner ID required' }, { status: 400 });
        }

        // Get owner's user record by ID
        // User.filter by id doesn't work reliably — use list and find
        const allUsers = await base44.asServiceRole.entities.User.list();
        const owner = allUsers?.find(u => u.id === ownerId);
        
        if (!owner) {
            return Response.json({ error: 'Owner not found' }, { status: 404 });
        }

        if (action === 'load') {
            // Also try store_owner_email for chain sub-stores
            const [suppliersByCreated, suppliersByOwner, orders, itemsByCreated, itemsByOwner] = await Promise.all([
                base44.asServiceRole.entities.Supplier.filter({ created_by: owner.email }),
                base44.asServiceRole.entities.Supplier.filter({ store_owner_email: owner.email }),
                base44.asServiceRole.entities.Order.filter({ store_owner_email: owner.email }, "-created_date"),
                base44.asServiceRole.entities.Item.filter({ created_by: owner.email }),
                base44.asServiceRole.entities.Item.filter({ store_owner_email: owner.email })
            ]);
            // Merge and deduplicate suppliers
            const allSuppliers = [...suppliersByCreated, ...suppliersByOwner];
            const seenS = new Set();
            const suppliers = allSuppliers.filter(s => { if (seenS.has(s.id)) return false; seenS.add(s.id); return true; });
            // Merge and deduplicate items (only name, id, unit, supplier_name — no price)
            const allItems = [...itemsByCreated, ...itemsByOwner];
            const seenI = new Set();
            const items = allItems
              .filter(i => { if (seenI.has(i.id)) return false; seenI.add(i.id); return true; })
              .map(i => ({ id: i.id, name: i.name, unit: i.unit, supplier_name: i.supplier_name, price_after_discount: i.price_after_discount || 0 }));
            
            return Response.json({ 
                suppliers, 
                orders,
                items,
                ownerEmail: owner.email,
                businessName: owner.business_name || owner.full_name || owner.email || ''
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

        if (action === 'createCount') {
            const { warehouse_name, count_date, count_type, items: countItems, total_inventory_value } = body;
            const count = await base44.asServiceRole.entities.InventoryCount.create({
                warehouse_name: warehouse_name || 'ספירה כללית',
                count_date: count_date || new Date().toISOString().split('T')[0],
                count_type: count_type || 'monthly',
                items: countItems || [],
                total_inventory_value: total_inventory_value || 0,
                status: 'completed',
                created_by: owner.email,
                store_owner_email: owner.email
            });
            return Response.json({ success: true, count });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Worker portal error:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});