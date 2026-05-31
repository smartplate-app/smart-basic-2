import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;

        const countDate = body.count_date || new Date().toISOString().split('T')[0];

        // Clean up the initial data
        const cleanedData = {
            ...body,
            status: 'in_progress',
            created_by: workingEmail,
            store_owner_email: workingEmail
        };

        // Always create a new one (do not fetch existing to avoid overwriting a deliberately clean "New Count")
        const newCount = await base44.asServiceRole.entities.InventoryCount.create(cleanedData);
        
        return Response.json({ success: true, count: newCount, isNew: true });

    } catch (error) {
        console.error("Error in getOrCreateCountDraft:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});