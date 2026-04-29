import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { idsToDelete, mappingToKeep } = await req.json();
        if (!idsToDelete || !Array.isArray(idsToDelete)) {
            return Response.json({ error: 'Missing idsToDelete' }, { status: 400 });
        }
        
        const isAdminImpersonating = user.role === 'admin' && user.acting_as_user_email;
        const queryEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
        const api = isAdminImpersonating ? base44.asServiceRole.entities : base44.entities;

        // Collect target items map
        const targetIds = [...new Set(Object.values(mappingToKeep || {}))];
        const targetRecipesMap = {};
        for (const id of targetIds) {
             const results = await api.Recipe.filter({ id });
             if (results && results.length > 0) {
                 targetRecipesMap[id] = results[0];
             }
        }

        // Helper to update linked entities
        const processEntityUpdates = async (entityName, processFn) => {
            try {
                let records = [];
                if (isAdminImpersonating) {
                    try {
                        const storeUsers = await base44.asServiceRole.entities.StoreUser.filter({ owner_email: queryEmail });
                        const allowedEmails = [queryEmail, ...storeUsers.map(u => u.user_email)];
                        
                        for (const email of allowedEmails) {
                            const r = await api[entityName].filter({ created_by: email });
                            if (r) records = [...records, ...r];
                        }
                        
                        try {
                            const r2 = await api[entityName].filter({ store_owner_email: queryEmail });
                            if (r2) records = [...records, ...r2];
                        } catch(e) {}
                    } catch(e) {
                        records = await api[entityName].filter({ created_by: queryEmail });
                    }
                } else {
                    records = await api[entityName].filter({});
                }

                const updates = [];
                const uniqueRecords = Array.from(new Map(records.map(r => [r.id, r])).values());
                
                for (const record of uniqueRecords) {
                    const updateData = processFn(record);
                    if (updateData) {
                        updates.push(api[entityName].update(record.id, updateData));
                    }
                }
                await Promise.all(updates);
            } catch (e) {
                console.error(`Error updating ${entityName}:`, e);
            }
        };

        // 1. Recipes (ingredients that reference prep recipes)
        await processEntityUpdates('Recipe', (recipe) => {
            if (!recipe.ingredients) return null;
            let changed = false;
            const newIngredients = recipe.ingredients.map(ing => {
                if (idsToDelete.includes(ing.item_id) && mappingToKeep[ing.item_id] && ing.is_prep_recipe) {
                    const targetId = mappingToKeep[ing.item_id];
                    const targetRecipe = targetRecipesMap[targetId];
                    if (targetRecipe) {
                        changed = true;
                        return { ...ing, item_id: targetRecipe.id, item_name: targetRecipe.name };
                    }
                }
                return ing;
            });
            
            // if we have items with the exact same item_id now, group them
            if (changed) {
               const grouped = {};
               newIngredients.forEach(i => {
                   if (!grouped[i.item_id]) grouped[i.item_id] = { ...i };
                   else {
                       grouped[i.item_id].quantity += i.quantity;
                       grouped[i.item_id].cost += i.cost;
                   }
               });
               return { ingredients: Object.values(grouped) };
            }
            
            return null;
        });

        // 2. CogsReport (recipes sold)
        await processEntityUpdates('CogsReport', (report) => {
            if (!report.items) return null;
            let changed = false;
            const newItems = report.items.map(item => {
                if (idsToDelete.includes(item.recipe_id) && mappingToKeep[item.recipe_id]) {
                    const targetId = mappingToKeep[item.recipe_id];
                    const targetRecipe = targetRecipesMap[targetId];
                    if (targetRecipe) {
                        changed = true;
                        return { ...item, recipe_id: targetRecipe.id, item_name: targetRecipe.name };
                    }
                }
                return item;
            });
            
            // if we have items with the exact same recipe_id now, we should group them
            if (changed) {
               const grouped = {};
               newItems.forEach(i => {
                   if (!grouped[i.recipe_id]) grouped[i.recipe_id] = { ...i };
                   else {
                       grouped[i.recipe_id].quantity_sold += i.quantity_sold;
                       grouped[i.recipe_id].total_sales += i.total_sales;
                   }
               });
               return { items: Object.values(grouped) };
            }
            
            return null;
        });

        // Delete the recipes
        for (const id of idsToDelete) {
             await api.Recipe.delete(id);
        }

        return Response.json({ success: true, deletedCount: idsToDelete.length });

    } catch (error) {
        console.error('Replace and Delete failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});