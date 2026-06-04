import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const counts = await base44.asServiceRole.entities.InventoryCount.filter({});
        const matches = [];

        for (const count of counts) {
            const str = JSON.stringify(count);
            if (str.includes('אורח') || str.includes('guest')) {
                matches.push({
                    id: count.id,
                    name: count.name,
                    warehouse_name: count.warehouse_name,
                    date: count.count_date
                });
            }
        }
        
        return Response.json({ matches });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});