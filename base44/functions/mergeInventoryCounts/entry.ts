import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.admin_original_email)) {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const { countIds } = await req.json();

        if (!countIds || countIds.length < 2) {
             return Response.json({ error: 'Select at least 2 counts to merge' }, { status: 400 });
        }

        // Fetch counts using service role
        const counts = [];
        for (const id of countIds) {
            const count = await base44.asServiceRole.entities.InventoryCount.get(id);
            if (count) {
                counts.push(count);
            }
        }

        if (counts.length === 0) {
            return Response.json({ error: 'Counts not found' }, { status: 404 });
        }

        const targetEmail = counts[0].created_by;

        const mergedItemsMap = new Map();
        counts.forEach(count => {
            (count.items || []).forEach(item => {
                const key = item.item_id || item.item_name; // Use ID or name as fallback
                if (!key) return;
                
                if (mergedItemsMap.has(key)) {
                    const existing = mergedItemsMap.get(key);
                    existing.counted_quantity = (Number(existing.counted_quantity) || 0) + (Number(item.counted_quantity) || 0);
                    existing.total_cost = (Number(existing.total_cost) || 0) + (Number(item.total_cost) || 0);
                } else {
                    mergedItemsMap.set(key, { ...item });
                }
            });
        });

        const mergedItems = Array.from(mergedItemsMap.values());
        const totalInventoryValue = mergedItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);

        const newCount = {
            warehouse_id: "",
            warehouse_name: "Merged Count",
            count_date: counts[0].count_date,
            count_type: "monthly",
            items: mergedItems,
            total_inventory_value: totalInventoryValue,
            name: "Merged: " + counts.map(c => c.name || c.warehouse_name).join(", "),
            notes: "Auto-merged by Admin.",
            status: "in_progress", // Keep as in progress so user can continue working
            created_by: targetEmail // Important: Assign it to the original user
        };

        await base44.asServiceRole.entities.InventoryCount.create(newCount);

        for (const count of counts) {
            await base44.asServiceRole.entities.InventoryCount.delete(count.id);
        }

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});