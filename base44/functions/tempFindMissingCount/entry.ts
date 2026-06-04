import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const counts = await base44.asServiceRole.entities.InventoryCount.filter({});
        const matches = [];
        
        for (const count of counts) {
            const warehouseTotals = {};
            for (const item of (count.items || [])) {
                const wh = item.warehouse_name || item.warehouse_id || 'Unknown';
                warehouseTotals[wh] = (warehouseTotals[wh] || 0) + (item.total_cost || 0);
            }
            
            for (const [wh, total] of Object.entries(warehouseTotals)) {
                if (Math.abs(total - 5921.08) < 2) {
                    matches.push({
                        count_id: count.id,
                        count_name: count.name,
                        count_date: count.count_date,
                        warehouse_id_or_name: wh,
                        total_cost: total
                    });
                }
            }
        }
        
        // Also let's check all Warehouses to see if there's a "Guest Room"
        const warehouses = await base44.asServiceRole.entities.Warehouse.filter({});
        const guestWarehouses = warehouses.filter(w => w.name.toLowerCase().includes('guest'));
        
        return Response.json({ matches, guestWarehouses });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});