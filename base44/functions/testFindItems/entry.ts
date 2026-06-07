import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const q = { created_by: "konaburgerltd@gmail.com" };
        const items = await base44.asServiceRole.entities.Item.filter(q, '-created_date', 10000);
        
        // group by name + supplier
        const map = new Map();
        for (const item of items) {
            const key = `${item.name?.trim() || ''}|${item.supplier_name?.trim() || ''}`;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
        }

        let deletedCount = 0;
        const deletedIds = [];
        
        for (const [key, group] of map.entries()) {
            if (group.length > 1) {
                // sort by updated_date desc, keep first
                group.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
                const toDelete = group.slice(1); // keep the newest
                
                for (const item of toDelete) {
                    await base44.asServiceRole.entities.Item.delete(item.id);
                    deletedCount++;
                    deletedIds.push(item.id);
                }
            }
        }

        return Response.json({ success: true, deletedCount, deletedIds });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});