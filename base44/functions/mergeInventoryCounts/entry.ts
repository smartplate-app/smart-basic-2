import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { countIds, mergedName } = await req.json();

        if (!countIds || countIds.length < 2) {
             return Response.json({ error: 'Select at least 2 counts to merge' }, { status: 400 });
        }

        const workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;

        // Fetch counts using service role but only merge ones belonging to this store
        const counts = [];
        for (const id of countIds) {
            const count = await base44.asServiceRole.entities.InventoryCount.get(id);
            if (count && count.created_by === workingEmail) {
                counts.push(count);
            }
        }

        if (counts.length < 2) {
            return Response.json({ error: 'Not enough valid counts found for this user' }, { status: 404 });
        }

        const mergedItemsMap = new Map();
        counts.forEach(count => {
            (count.items || []).forEach(item => {
                const key = item.item_id || item.item_name; // Use ID or name as fallback
                if (!key) return;
                
                if (mergedItemsMap.has(key)) {
                    const existing = mergedItemsMap.get(key);
                    existing.counted_quantity = (Number(existing.counted_quantity) || 0) + (Number(item.counted_quantity) || 0);
                    existing.total_cost = (Number(existing.total_cost) || 0) + (Number(item.total_cost) || 0);
                    
                    if (item.notes) {
                        existing.notes = existing.notes ? `${existing.notes}, ${item.notes}` : item.notes;
                    }
                } else {
                    mergedItemsMap.set(key, { ...item, warehouse_id: "all_summary", warehouse_name: "Summary" });
                }
            });
        });

        const mergedItems = Array.from(mergedItemsMap.values());
        const totalInventoryValue = mergedItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);

        const newCount = {
            warehouse_id: "all_summary",
            warehouse_name: mergedName || "Head Warehouse Summary",
            count_date: counts[0].count_date,
            count_type: "monthly",
            items: mergedItems,
            total_inventory_value: totalInventoryValue,
            name: mergedName || "Head Warehouse Summary",
            notes: "Auto-merged from: " + counts.map(c => c.name || c.warehouse_name).join(", "),
            status: "in_progress", // Keep as in progress so user can review before completing
            created_by: workingEmail
        };

        const createdCount = await base44.asServiceRole.entities.InventoryCount.create(newCount);

        // We DO NOT delete the old counts anymore to keep data intact
        // Just mark them as merged in the notes or rename them
        for (const count of counts) {
            await base44.asServiceRole.entities.InventoryCount.update(count.id, {
                notes: ((count.notes || '') + ' [Merged into ' + createdCount.id + ']').trim(),
                name: ((count.name || count.warehouse_name || '') + ' (Merged)').trim()
            });
        }

        return Response.json({ success: true, count: createdCount });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});