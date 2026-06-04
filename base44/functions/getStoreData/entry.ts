import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, ownerEmail, ...params } = await req.json();

        // Security check: ensure user is a store user for this owner
        if (user.email !== ownerEmail && user.role !== 'admin') {
            const storeUserRecords = await base44.asServiceRole.entities.StoreUser.filter({ 
                user_email: user.email, 
                owner_email: ownerEmail,
                is_active: true 
            });

            if (!storeUserRecords || storeUserRecords.length === 0) {
                // Also check if head store
                const myStores = await base44.asServiceRole.entities.ChainStore.filter({ user_email: user.email });
                const myStore = myStores?.[0];
                let isHead = false;
                if (myStore && !myStore.is_head_store && myStore.chain_id) {
                    const heads = await base44.asServiceRole.entities.ChainStore.filter({ chain_id: myStore.chain_id, is_head_store: true });
                    const headEmail = heads?.[0]?.user_email;
                    if (headEmail === ownerEmail) {
                        isHead = true;
                    }
                }

                if (!isHead) {
                    return Response.json({ error: 'Forbidden' }, { status: 403 });
                }
            }
        }

        if (action === 'getSuppliers') {
            const q = { $or: [{ created_by: ownerEmail }, { store_owner_email: ownerEmail }] };
            const suppliers = await base44.asServiceRole.entities.Supplier.filter(q, '-created_date', 1000);
            return Response.json({ success: true, suppliers });
        }

        if (action === 'getOrders') {
            const q = { $or: [{ created_by: ownerEmail }, { store_owner_email: ownerEmail }] };
            const orders = await base44.asServiceRole.entities.Order.filter(q, '-created_date', 2000);
            return Response.json({ success: true, orders });
        }

        if (action === 'getItems') {
            const q = { $or: [{ created_by: ownerEmail }, { store_owner_email: ownerEmail }] };
            if (params.supplierId) {
                q.supplier_id = params.supplierId;
            }
            const items = await base44.asServiceRole.entities.Item.filter(q, '-created_date', 5000);
            return Response.json({ success: true, items });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('getStoreData error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});