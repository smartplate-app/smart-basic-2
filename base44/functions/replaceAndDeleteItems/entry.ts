import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

        // Fetch ALL items in one go to avoid rate limits
        let allItems = [];
        if (isAdminImpersonating) {
            try {
                const storeUsers = await base44.asServiceRole.entities.StoreUser.filter({ owner_email: queryEmail });
                const allowedEmails = [queryEmail, ...storeUsers.map(u => u.user_email)];
                for (const email of allowedEmails) {
                    const r = await api.Item.filter({ created_by: email }, "-created_date", 10000);
                    if (r) allItems = [...allItems, ...r];
                }
                const r2 = await api.Item.filter({ store_owner_email: queryEmail }, "-created_date", 10000);
                if (r2) allItems = [...allItems, ...r2];
            } catch(e) {
                allItems = await api.Item.filter({ created_by: queryEmail }, "-created_date", 10000);
            }
        } else {
            allItems = await api.Item.filter({}, "-created_date", 10000);
        }

        // Fetch deleted items to get their warehouse_ids
        const deletedItems = allItems.filter(i => idsToDelete.includes(i.id));

        // Collect target items map
        const targetIds = [...new Set(Object.values(mappingToKeep || {}))];
        const targetItemsMap = {};
        allItems.forEach(i => {
            if (targetIds.includes(i.id)) {
                targetItemsMap[i.id] = i;
            }
        });

        // Update target items with deleted items' warehouses
        for (const targetId of targetIds) {
             const targetItem = targetItemsMap[targetId];
             if (!targetItem) continue;

             const deletedForTarget = deletedItems.filter(di => mappingToKeep[di.id] === targetId);
             
             let newWhIds = [...(targetItem.warehouse_ids || [])];
             if (targetItem.warehouse_id && !newWhIds.includes(targetItem.warehouse_id)) newWhIds.push(targetItem.warehouse_id);
             
             let newWhNames = [...(targetItem.warehouse_names || [])];
             if (targetItem.warehouse_name && !newWhNames.includes(targetItem.warehouse_name)) newWhNames.push(targetItem.warehouse_name);

             let changed = false;
             for (const di of deletedForTarget) {
                 const diWhIds = di.warehouse_ids || (di.warehouse_id ? [di.warehouse_id] : []);
                 const diWhNames = di.warehouse_names || (di.warehouse_name ? [di.warehouse_name] : []);
                 
                 diWhIds.forEach((id, idx) => {
                     if (!newWhIds.includes(id)) {
                         newWhIds.push(id);
                         if (diWhNames[idx] && !newWhNames.includes(diWhNames[idx])) {
                             newWhNames.push(diWhNames[idx]);
                         }
                         changed = true;
                     }
                 });
             }

             if (changed) {
                 await api.Item.update(targetId, {
                     warehouse_ids: newWhIds,
                     warehouse_names: newWhNames,
                     warehouse_id: newWhIds.length > 0 ? newWhIds[0] : "",
                     warehouse_name: newWhNames.length > 0 ? newWhNames[0] : ""
                 });
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
                            const r = await api[entityName].filter({ created_by: email }, "-created_date", 10000);
                            if (r) records = [...records, ...r];
                        }
                        
                        try {
                            const r2 = await api[entityName].filter({ store_owner_email: queryEmail }, "-created_date", 10000);
                            if (r2) records = [...records, ...r2];
                        } catch(e) {}
                    } catch(e) {
                        records = await api[entityName].filter({ created_by: queryEmail }, "-created_date", 10000);
                    }
                } else {
                    records = await api[entityName].filter({}, "-created_date", 10000);
                }

                const updates = [];
                const uniqueRecords = Array.from(new Map(records.map(r => [r.id, r])).values());
                
                for (const record of uniqueRecords) {
                    const updateData = processFn(record);
                    if (updateData) {
                        updates.push(api[entityName].update(record.id, updateData));
                        if (updates.length % 10 === 0) {
                            await Promise.all(updates.splice(0, updates.length));
                            await new Promise(r => setTimeout(r, 50));
                        }
                    }
                }
                if (updates.length > 0) {
                    await Promise.all(updates);
                }
            } catch (e) {
                console.error(`Error updating ${entityName}:`, e);
            }
        };

        // 1. Recipes
        await processEntityUpdates('Recipe', (recipe) => {
            if (!recipe.ingredients) return null;
            let changed = false;
            const newIngredients = recipe.ingredients.map(ing => {
                if (idsToDelete.includes(ing.item_id) && mappingToKeep[ing.item_id]) {
                    const targetId = mappingToKeep[ing.item_id];
                    const targetItem = targetItemsMap[targetId];
                    if (targetItem) {
                        changed = true;
                        return { ...ing, item_id: targetItem.id, item_name: targetItem.name };
                    }
                }
                return ing;
            });
            return changed ? { ingredients: newIngredients } : null;
        });

        // 2. Warehouses
        await processEntityUpdates('Warehouse', (wh) => {
            if (!wh.catalog_items) return null;
            let changed = false;
            let newCatalog = [...wh.catalog_items];
            
            const hasDuplicates = newCatalog.some(id => idsToDelete.includes(id));
            if (hasDuplicates) {
                changed = true;
                const targetsToAdd = newCatalog
                    .filter(id => idsToDelete.includes(id) && mappingToKeep[id])
                    .map(id => mappingToKeep[id]);
                
                newCatalog = newCatalog.filter(id => !idsToDelete.includes(id));
                
                targetsToAdd.forEach(targetId => {
                    if (!newCatalog.includes(targetId)) {
                        newCatalog.push(targetId);
                    }
                });
            }
            return changed ? { catalog_items: newCatalog } : null;
        });

        // 3. Other items arrays
        const updateItemsArray = (entity) => {
            if (!entity.items) return null;
            let changed = false;
            const newItems = entity.items.map(item => {
                if (idsToDelete.includes(item.item_id) && mappingToKeep[item.item_id]) {
                    const targetId = mappingToKeep[item.item_id];
                    const targetItem = targetItemsMap[targetId];
                    if (targetItem) {
                        changed = true;
                        return { ...item, item_id: targetItem.id, item_name: targetItem.name };
                    }
                }
                return item;
            });
            return changed ? { items: newItems } : null;
        };

        await processEntityUpdates('Order', updateItemsArray);
        await processEntityUpdates('InventoryCount', updateItemsArray);
        try { await processEntityUpdates('WasteReport', updateItemsArray); } catch(e) {}
        
        await processEntityUpdates('SupplyReceipt', (receipt) => {
            if (!receipt.verified_items) return null;
            let changed = false;
            const newItems = receipt.verified_items.map(item => {
                if (idsToDelete.includes(item.item_id) && mappingToKeep[item.item_id]) {
                    const targetId = mappingToKeep[item.item_id];
                    const targetItem = targetItemsMap[targetId];
                    if (targetItem) {
                        changed = true;
                        return { ...item, item_id: targetItem.id, item_name: targetItem.name };
                    }
                }
                return item;
            });
            return changed ? { verified_items: newItems } : null;
        });

        // Delete the items safely
        let delCount = 0;
        for (const id of idsToDelete) {
             try {
                 await api.Item.delete(id);
                 delCount++;
             } catch(e) {
                 console.warn("Failed to delete item", id, e.message);
             }
             // brief delay to avoid rate limit
             await new Promise(r => setTimeout(r, 20));
        }

        return Response.json({ success: true, deletedCount: delCount });

    } catch (error) {
        console.error('Replace and Delete failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});