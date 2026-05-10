import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        
        let targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
        if (!user.store_user_owner_email) {
            try {
                const recs = await base44.asServiceRole.entities.StoreUser.filter({ user_email: user.email, is_active: true });
                if (recs.length > 0) targetEmail = recs[0].owner_email;
            } catch(e){}
        }

        const recipes = await base44.asServiceRole.entities.Recipe.filter({ created_by: targetEmail }, 'name', 10000);
        let deleted = 0;
        for (const recipe of recipes) {
            await base44.asServiceRole.entities.Recipe.delete(recipe.id);
            deleted++;
        }
        
        return Response.json({ success: true, deleted, targetEmail });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});