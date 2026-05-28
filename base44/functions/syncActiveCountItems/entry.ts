import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentCountId, updatedItems } = await req.json();

        if (!updatedItems || updatedItems.length === 0) {
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
            let items = count.items || [];
            let changed = false;

            // Apply updates
            for (const updatedItem of updatedItems) {
                let found = false;
                items = items.map(existingItem => {
                    if (existingItem.item_id === updatedItem.item_id && existingItem.warehouse_id === updatedItem.warehouse_id) {
                        found = true;
                        // Only update if quantity changed
                        if (existingItem.counted_quantity !== updatedItem.counted_quantity || existingItem.notes !== updatedItem.notes) {
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
                await base44.asServiceRole.entities.InventoryCount.update(count.id, {
                    items,
                    total_inventory_value,
                    // If this is the current count being edited, we also update its name/notes if needed?
                    // For simplicity, we just update the items. The frontend handles full saves on submit.
                });
            }
        });

        await Promise.all(updatePromises);

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error in syncActiveCountItems:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});