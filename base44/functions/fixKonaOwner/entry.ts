import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const targetEmail = "konaburgerltd@gmail.com";
    const oldEmail = "service+0e5bb138-a3c3-4e4f-b3bb-9af212a26df1@no-reply.base44.com";
    
    // Update Recipes
    const recipes = await base44.asServiceRole.entities.Recipe.filter({ created_by: oldEmail }, 'name', 10000);
    for (const r of recipes) {
      await base44.asServiceRole.entities.Recipe.update(r.id, { created_by: targetEmail });
    }

    // Update Items
    const items = await base44.asServiceRole.entities.Item.filter({ created_by: oldEmail }, 'name', 10000);
    for (const i of items) {
      await base44.asServiceRole.entities.Item.update(i.id, { created_by: targetEmail });
    }

    // Update Suppliers
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: oldEmail }, 'name', 10000);
    for (const s of suppliers) {
      await base44.asServiceRole.entities.Supplier.update(s.id, { created_by: targetEmail });
    }

    return Response.json({
      success: true,
      updatedRecipes: recipes.length,
      updatedItems: items.length,
      updatedSuppliers: suppliers.length
    });
  } catch (e) {
    return Response.json({ error: e.message, stack: e.stack });
  }
});