import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        // We will call the function directly as service role to mimic what getAdminData does internally
        const userEmail = 'demo@foodcostapp.com';
        
        const recipes = await base44.asServiceRole.entities.Recipe.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] });
        
        return Response.json({
            success: true,
            recipeCount: recipes.length,
            recipes: recipes
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});