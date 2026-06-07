import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const q = { $or: [{ created_by: "konaburgerltd@gmail.com" }, { store_owner_email: "konaburgerltd@gmail.com" }] };
        let suppliersData = await base44.asServiceRole.entities.Supplier.filter(q, '-created_date', 10000);

        const allowedEmails = new Set(["konaburgerltd@gmail.com"]);

        const bFilter = suppliersData.length;

        suppliersData = suppliersData.filter((s) =>
            allowedEmails.has(s.created_by) || (s.store_owner_email && allowedEmails.has(s.store_owner_email))
        );

        const aFilter = suppliersData.length;

        return Response.json({ success: true, bFilter, aFilter });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});