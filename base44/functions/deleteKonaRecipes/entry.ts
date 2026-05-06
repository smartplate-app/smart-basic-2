import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let targetEmail = "konaburgerltd@gmail.com";

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