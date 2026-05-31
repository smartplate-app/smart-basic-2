import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let adminItem = await base44.asServiceRole.entities.Item.create({
            name: "Test Admin Item",
            supplier_id: "test",
            unit: "unit",
            created_by: "guestroom@smartplate.org"
        });

        return Response.json({
            created_by_id: adminItem.created_by_id,
            success: true
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});