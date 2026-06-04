import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const recipes = await base44.asServiceRole.entities.Recipe.filter({});
        const cogs = await base44.asServiceRole.entities.CogsReport.filter({});
        
        const summary = {
            recipesCount: recipes.length,
            recipesByCreatedBy: {},
            recipesByStoreOwner: {},
            cogsCount: cogs.length,
            cogsByCreatedBy: {},
            cogsByStoreOwner: {}
        };
        
        for (const r of recipes) {
            summary.recipesByCreatedBy[r.created_by] = (summary.recipesByCreatedBy[r.created_by] || 0) + 1;
            summary.recipesByStoreOwner[r.store_owner_email] = (summary.recipesByStoreOwner[r.store_owner_email] || 0) + 1;
        }
        
        for (const c of cogs) {
            summary.cogsByCreatedBy[c.created_by] = (summary.cogsByCreatedBy[c.created_by] || 0) + 1;
            summary.cogsByStoreOwner[c.store_owner_email] = (summary.cogsByStoreOwner[c.store_owner_email] || 0) + 1;
        }

        return Response.json(summary);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});