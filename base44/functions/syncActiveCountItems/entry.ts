import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentCountId, updatedItems, metadata } = await req.json();

        if ((!updatedItems || updatedItems.length === 0) && !metadata) {
            return Response.json({ success: true });
        }

        // We want to update these items in ALL in_progress counts for this store
        const workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;

        // Fetch all in-progress counts
        const allInProgress = await base44.asServiceRole.entities.InventoryCount.filter({
            created_by: workingEmail,
            status: 'in_progress'
        });

        const updatePromises = allInProgress.map(async (count) => {
            // Re-fetch the count immediately before applying changes to minimize race conditions
            // between multiple users counting simultaneously.
            const freshCount = await base44.asServiceRole.entities.InventoryCount.get(count.id);
            if (!freshCount) return;

            let items = freshCount.items || [];
            let changed = false;

            // Apply updates
            for (const updatedItem of (updatedItems || [])) {
                let found = false;
                items = items.map(existingItem => {
                    if (existingItem.item_id === updatedItem.item_id && existingItem.warehouse_id === updatedItem.warehouse_id) {
                        found = true;
                        
                        const incomingTime = updatedItem.last_updated_at || 0;
                        const existingTime = existingItem.last_updated_at || 0;
                        
                        // Only update if incoming is newer or equal
                        if (incomingTime >= existingTime && (existingItem.counted_quantity !== updatedItem.counted_quantity || existingItem.notes !== updatedItem.notes || existingItem.counted_cases !== updatedItem.counted_cases || existingItem.counted_units !== updatedItem.counted_units)) {
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

            if (changed || count.id === currentCountId) { // Always update the current one to update saved timestamp
                const total_inventory_value = items.reduce((sum, i) => sum + (Number(i.total_cost) || 0), 0);
                const updates = { items, total_inventory_value };
                if (count.id === currentCountId && metadata) {
                    Object.assign(updates, metadata);
                }
                await base44.asServiceRole.entities.InventoryCount.update(count.id, updates);
            }
        });

        await Promise.all(updatePromises);

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error in syncActiveCountItems:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});