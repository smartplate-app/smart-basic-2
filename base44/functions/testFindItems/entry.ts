import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const items = await base44.asServiceRole.entities.Item.filter({}, "name", 100);
        
        return Response.json({ success: true, items: items.map(i => ({ id: i.id, name: i.name, created_by: i.created_by, store_owner_email: i.store_owner_email })) });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});