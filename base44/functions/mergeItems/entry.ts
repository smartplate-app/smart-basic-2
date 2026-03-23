import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { itemIds } = await req.json();
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length < 2) {
            return Response.json({ error: 'Please select at least 2 items to merge' }, { status: 400 });
        }

        // 1. Fetch items to identify master
        const items = [];
        for (const id of itemIds) {
            try {
                const results = await base44.entities.Item.filter({ id });
                if (results && results.length > 0) items.push(results[0]);
            } catch (e) {
                console.error(`Failed to fetch item ${id}`, e);
            }
        }

        if (items.length < 2) {
            return Response.json({ error: 'Could not find all selected items' }, { status: 404 });
        }

        // Sort: Oldest created first (master)
        items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        const masterItem = items[0];
        const duplicates = items.slice(1);
        const duplicateIds = duplicates.map(i => i.id);

        console.log(`Merging items. Master: ${masterItem.id} (${masterItem.name}). Duplicates: ${duplicateIds.join(', ')}`);

        // Helper to process batched updates
        const processEntityUpdates = async (entityName, listFilter, processFn) => {
            try {
                // Fetching all might be heavy, but necessary without "IN" query support
                // Optimization: In a real app with millions of records this needs pagination/filtering
                // For now assuming reasonable dataset size for a restaurant
                const records = await base44.entities[entityName].filter(listFilter);
                const updates = [];
                for (const record of records) {
                    const updateData = processFn(record);
                    if (updateData) {
                        updates.push(base44.entities[entityName].update(record.id, updateData));
                    }
                }
                await Promise.all(updates);
                console.log(`Updated ${updates.length} ${entityName} records`);
            } catch (e) {
                console.error(`Error updating ${entityName}:`, e);
            }
        };

        // Recipes (ingredients)
        await processEntityUpdates('Recipe', {}, (recipe) => {
            if (!recipe.ingredients) return null;
            let changed = false;
            const newIngredients = recipe.ingredients.map(ing => {
                if (duplicateIds.includes(ing.item_id)) {
                    changed = true;
                    return { ...ing, item_id: masterItem.id, item_name: masterItem.name };
                }
                return ing;
            });
            return changed ? { ingredients: newIngredients } : null;
        });

        // Orders (items)
        await processEntityUpdates('Order', {}, (order) => {
            if (!order.items) return null;
            let changed = false;
            const newItems = order.items.map(item => {
                if (duplicateIds.includes(item.item_id)) {
                    changed = true;
                    return { ...item, item_id: masterItem.id, item_name: masterItem.name };
                }
                return item;
            });
            return changed ? { items: newItems } : null;
        });

        // SupplyReceipts (verified_items)
        await processEntityUpdates('SupplyReceipt', {}, (receipt) => {
            if (!receipt.verified_items) return null;
            let changed = false;
            const newItems = receipt.verified_items.map(item => {
                if (duplicateIds.includes(item.item_id)) {
                    changed = true;
                    return { ...item, item_id: masterItem.id, item_name: masterItem.name };
                }
                return item;
            });
            return changed ? { verified_items: newItems } : null;
        });

        // InventoryCounts (items)
        await processEntityUpdates('InventoryCount', {}, (count) => {
            if (!count.items) return null;
            let changed = false;
            const newItems = count.items.map(item => {
                if (duplicateIds.includes(item.item_id)) {
                    changed = true;
                    return { ...item, item_id: masterItem.id, item_name: masterItem.name };
                }
                return item;
            });
            return changed ? { items: newItems } : null;
        });
        
        // WasteReports (items)
        try {
            await processEntityUpdates('WasteReport', {}, (report) => {
                if (!report.items) return null;
                let changed = false;
                const newItems = report.items.map(item => {
                    if (duplicateIds.includes(item.item_id)) {
                        changed = true;
                        return { ...item, item_id: masterItem.id, item_name: masterItem.name };
                    }
                    return item;
                });
                return changed ? { items: newItems } : null;
            });
        } catch (e) {}

        // Warehouses (catalog_items)
        await processEntityUpdates('Warehouse', {}, (wh) => {
            if (!wh.catalog_items) return null;
            let changed = false;
            let newCatalog = [...wh.catalog_items];
            
            const hasDuplicates = newCatalog.some(id => duplicateIds.includes(id));
            if (hasDuplicates) {
                changed = true;
                newCatalog = newCatalog.filter(id => !duplicateIds.includes(id));
                if (!newCatalog.includes(masterItem.id)) {
                    newCatalog.push(masterItem.id);
                }
            }
            return changed ? { catalog_items: newCatalog } : null;
        });

        // ItemAlias (item_id)
        try {
             const aliases = await base44.entities.ItemAlias.filter({});
             const updates = [];
             for (const alias of aliases) {
                 if (duplicateIds.includes(alias.item_id)) {
                     updates.push(base44.entities.ItemAlias.update(alias.id, { item_id: masterItem.id }));
                 }
             }
             await Promise.all(updates);
        } catch (e) {}

        // 3. Delete duplicates
        for (const id of duplicateIds) {
            await base44.entities.Item.delete(id);
        }

        return Response.json({ success: true, masterItem, mergedCount: duplicateIds.length });

    } catch (error) {
        console.error('Merge failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});