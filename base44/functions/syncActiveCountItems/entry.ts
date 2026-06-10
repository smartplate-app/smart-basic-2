import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentCountId, updatedItems, metadata, total_inventory_value: clientTotal, data_env } = await req.json();

        if (!currentCountId) {
            return Response.json({ success: true });
        }

        // Skip if nothing to do
        if ((!updatedItems || updatedItems.length === 0) && !metadata && clientTotal === undefined) {
            return Response.json({ success: true });
        }

        // Explicitly set the environment to ensure Test mode works correctly
        const env = data_env || req.headers.get('x-b44-env') || 'prod';
        
        // Fetch only the current count
        const freshCount = await base44.asServiceRole.entities.InventoryCount.get(currentCountId, { data_env: env });
        if (!freshCount) {
            return Response.json({ success: true });
        }

        let items = freshCount.items || [];
        let changed = false;

        // Apply item updates
        for (const updatedItem of (updatedItems || [])) {
            let found = false;
            items = items.map(existingItem => {
                if (existingItem.item_id === updatedItem.item_id && existingItem.warehouse_id === updatedItem.warehouse_id) {
                    found = true;
                    const incomingTime = updatedItem.last_updated_at || 0;
                    const existingTime = existingItem.last_updated_at || 0;
                    if (incomingTime >= existingTime) {
                        changed = true;
                        return { ...existingItem, ...updatedItem };
                    }
                }
                return existingItem;
            });

            if (!found) {
                items.push(updatedItem);
                changed = true;
            }
        }

        const calculatedTotal = items.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0);
        const total_inventory_value = calculatedTotal > 0 ? calculatedTotal : (clientTotal !== undefined ? clientTotal : 0);

        // Sanity check to avoid NaN
        if (isNaN(total_inventory_value)) {
            total_inventory_value = 0;
        }

        const updates = { items, total_inventory_value };
        if (metadata) {
            Object.assign(updates, metadata);
        }

        await base44.asServiceRole.entities.InventoryCount.update(currentCountId, updates, { data_env: env });

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error in syncActiveCountItems:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});