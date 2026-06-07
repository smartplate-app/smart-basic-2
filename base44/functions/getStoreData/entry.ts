import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getStoreData - allows store-users (workers/managers) to fetch their store owner's data.
 * Validates the caller is an active StoreUser before returning data via service role.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, ownerEmail } = body;

        if (!ownerEmail) {
            return Response.json({ error: 'ownerEmail is required' }, { status: 400 });
        }

        // Verify the caller is an active StoreUser for this owner
        const storeUserRecords = await base44.asServiceRole.entities.StoreUser.filter({
            user_email: user.email,
            owner_email: ownerEmail,
            is_active: true
        });

        if (!storeUserRecords || storeUserRecords.length === 0) {
            return Response.json({ error: 'Forbidden: not an active store user for this owner' }, { status: 403 });
        }

        const q = { $or: [{ created_by: ownerEmail }, { store_owner_email: ownerEmail }] };

        if (action === 'getSuppliers') {
            const suppliers = await base44.asServiceRole.entities.Supplier.filter(q, 'name', 10000);
            return Response.json({ success: true, suppliers });
        }

        if (action === 'getOrders') {
            const orders = await base44.asServiceRole.entities.Order.filter(q, '-created_date', 10000);
            return Response.json({ success: true, orders });
        }

        if (action === 'getItems') {
            const items = await base44.asServiceRole.entities.Item.filter(q, 'name', 10000);
            return Response.json({ success: true, items });
        }

        if (action === 'getWarehouses') {
            const warehouses = await base44.asServiceRole.entities.Warehouse.filter(q, 'name', 10000);
            return Response.json({ success: true, warehouses });
        }

        if (action === 'getInventoryCounts') {
            const counts = await base44.asServiceRole.entities.InventoryCount.filter(q, '-count_date', 10000);
            return Response.json({ success: true, counts });
        }

        if (action === 'getReceipts') {
            const receipts = await base44.asServiceRole.entities.SupplyReceipt.filter(q, '-received_date', 10000);
            return Response.json({ success: true, receipts });
        }

        if (action === 'getFullData') {
            const [suppliers, orders, items, warehouses, receipts, counts] = await Promise.all([
                base44.asServiceRole.entities.Supplier.filter(q, 'name', 10000),
                base44.asServiceRole.entities.Order.filter(q, '-created_date', 10000),
                base44.asServiceRole.entities.Item.filter(q, 'name', 10000),
                base44.asServiceRole.entities.Warehouse.filter(q, 'name', 10000),
                base44.asServiceRole.entities.SupplyReceipt.filter(q, '-received_date', 10000),
                base44.asServiceRole.entities.InventoryCount.filter(q, '-count_date', 10000)
            ]);
            return Response.json({ success: true, suppliers, orders, items, warehouses, receipts, counts });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error in getStoreData:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});