import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const draftData = {
          supplier_id: "test",
          supplier_name: "test",
          restaurant_name: "test",
          items: [],
          total_cost: 0,
          store_owner_email: "office@smartplate.biz",
          created_by: "office@smartplate.biz",
          status: 'draft'
        };

        const res = await fetch("https://preview-sandbox--699c4d19592434b7f867b2c6.base44.app/api/entities/Order", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Passing no authorization to trigger RLS if it's public? No it requires auth.
            },
            body: JSON.stringify(draftData)
        });
        const json = await res.json();
        
        return Response.json({ json });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});