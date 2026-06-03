import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const email = "guestroom@smartplate.org";
        const query = { $or: [{ created_by: email }, { store_owner_email: email }] };
        
        // Test with limit 10000
        const res = await base44.asServiceRole.entities.Item.filter(query, "name", 10000);
        
        return Response.json({
            count: res.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});