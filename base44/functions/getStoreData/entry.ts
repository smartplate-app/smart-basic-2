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

        const fetchBoth = async (entityName, sortBy = '-created_date') => {
            const [r1, r2] = await Promise.all([
                base44.asServiceRole.entities[entityName].filter({ created_by: ownerEmail }, sortBy, 10000),
                base44.asServiceRole.entities[entityName].filter({ store_owner_email: ownerEmail }, sortBy, 10000)
            ]);
            const combined = [...(r1 || []), ...(r2 || [])];
            const deduped = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            if (entityName === 'Warehouse') return deduped.filter(w => w.is_active !== false);
            return deduped;
        };

        if (action === 'getSuppliers') {
            const suppliers = await fetchBoth('Supplier', 'name');
            return Response.json({ success: true, suppliers });
        }

        if (action === 'getOrders') {
            const orders = await fetchBoth('Order', '-created_date');
            return Response.json({ success: true, orders });
        }

        if (action === 'getItems') {
            const items = await fetchBoth('Item', 'name');
            return Response.json({ success: true, items });
        }

        if (action === 'getWarehouses') {
            const warehouses = await fetchBoth('Warehouse', 'name');
            return Response.json({ success: true, warehouses });
        }

        if (action === 'getInventoryCounts') {
            const counts = await fetchBoth('InventoryCount', '-count_date');
            return Response.json({ success: true, counts });
        }

        if (action === 'getReceipts') {
            const receipts = await fetchBoth('SupplyReceipt', '-received_date');
            return Response.json({ success: true, receipts });
        }

        if (action === 'getFullData') {
            const [suppliers, orders, items, warehouses, receipts, counts] = await Promise.all([
                fetchBoth('Supplier', 'name'),
                fetchBoth('Order', '-created_date'),
                fetchBoth('Item', 'name'),
                fetchBoth('Warehouse', 'name'),
                fetchBoth('SupplyReceipt', '-received_date'),
                fetchBoth('InventoryCount', '-count_date')
            ]);
            return Response.json({ success: true, suppliers, orders, items, warehouses, receipts, counts });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error in getStoreData:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});