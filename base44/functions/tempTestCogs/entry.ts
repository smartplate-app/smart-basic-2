import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This is a service role test to bypass RLS and see what's actually in DB
        const dataOwned = await base44.asServiceRole.entities.CogsReport.filter({ store_owner_email: 'office@smartplate.biz' }, "-created_date");
        
        return Response.json({
            cogsCount: dataOwned.length,
            cogs: dataOwned
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});