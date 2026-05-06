import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const oldEmail = "service+0e5bb138-a3c3-4e4f-b3bb-9af212a26df1@no-reply.base44.com";
    const targetEmail = "konaburgerltd@gmail.com";

    // 1. Migrate Suppliers
    const oldSuppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: oldEmail }, 'name', 10000);
    const newSuppliersData = oldSuppliers.map(s => {
      const data = { ...s };
      delete data.id;
      delete data.created_date;
      delete data.updated_date;
      delete data.created_by_id;
      data.created_by = targetEmail;
      return data;
    });
    
    const supplierMap = {};
    if (newSuppliersData.length > 0) {
      const newSuppliers = await base44.asServiceRole.entities.Supplier.bulkCreate(newSuppliersData);
      for (let i = 0; i < oldSuppliers.length; i++) {
        supplierMap[oldSuppliers[i].id] = newSuppliers[i].id;
      }
    }

    // 2. Migrate Items
    const oldItems = await base44.asServiceRole.entities.Item.filter({ created_by: oldEmail }, 'name', 10000);
    const newItemsData = oldItems.map(i => {
      const data = { ...i };
      delete data.id;
      delete data.created_date;
      delete data.updated_date;
      delete data.created_by_id;
      data.created_by = targetEmail;
      if (data.supplier_id && supplierMap[data.supplier_id]) {
        data.supplier_id = supplierMap[data.supplier_id];
      }
      return data;
    });

    const itemMap = {};
    if (newItemsData.length > 0) {
        // chunk bulk create to avoid size limits
        const chunkSize = 100;
        const newItems = [];
        for (let i = 0; i < newItemsData.length; i += chunkSize) {
            const chunk = newItemsData.slice(i, i + chunkSize);
            const createdChunk = await base44.asServiceRole.entities.Item.bulkCreate(chunk);
            newItems.push(...createdChunk);
        }
        for (let i = 0; i < oldItems.length; i++) {
            itemMap[oldItems[i].id] = newItems[i].id;
        }
    }

    // 3. Migrate Recipes
    const oldRecipes = await base44.asServiceRole.entities.Recipe.filter({ created_by: oldEmail }, 'name', 10000);
    const newRecipesData = oldRecipes.map(r => {
      const data = { ...r };
      delete data.id;
      delete data.created_date;
      delete data.updated_date;
      delete data.created_by_id;
      data.created_by = targetEmail;
      if (data.ingredients) {
        data.ingredients = data.ingredients.map(ing => {
          if (ing.item_id && itemMap[ing.item_id]) {
            ing.item_id = itemMap[ing.item_id];
          }
          return ing;
        });
      }
      return data;
    });

    if (newRecipesData.length > 0) {
      await base44.asServiceRole.entities.Recipe.bulkCreate(newRecipesData);
    }

    // 4. Delete Old Entities
    for (const r of oldRecipes) {
      await base44.asServiceRole.entities.Recipe.delete(r.id);
    }
    for (const i of oldItems) {
      await base44.asServiceRole.entities.Item.delete(i.id);
    }
    for (const s of oldSuppliers) {
      await base44.asServiceRole.entities.Supplier.delete(s.id);
    }

    return Response.json({
      success: true,
      migratedSuppliers: oldSuppliers.length,
      migratedItems: oldItems.length,
      migratedRecipes: oldRecipes.length
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});