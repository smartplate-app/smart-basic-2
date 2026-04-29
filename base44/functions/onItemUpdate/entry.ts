import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { event, data, old_data, changed_fields } = payload;
        
        if (event?.type !== 'update' || !data || !old_data) {
            return Response.json({ message: "Not an update event" });
        }

        if (!changed_fields || !changed_fields.includes("name")) {
             return Response.json({ message: "Name did not change" });
        }

        const base44 = createClientFromRequest(req);
        const api = base44.asServiceRole.entities;
        
        const itemId = data.id;
        const newName = data.name;
        
        // Find the root owner
        let ownerEmail = data.store_owner_email || data.created_by;
        try {
            const possibleStoreUser = await api.StoreUser.filter({ user_email: ownerEmail });
            if (possibleStoreUser && possibleStoreUser.length > 0 && possibleStoreUser[0].owner_email) {
                 ownerEmail = possibleStoreUser[0].owner_email;
            }
        } catch(e) {}

        let allowedEmails = [ownerEmail];
        try {
            const storeUsers = await api.StoreUser.filter({ owner_email: ownerEmail });
            allowedEmails = [...allowedEmails, ...storeUsers.map(u => u.user_email)];
            
            const chainStores = await api.ChainStore.filter({ head_store_user_email: ownerEmail });
            for (const cs of chainStores) {
                allowedEmails.push(cs.store_user_email);
                const subStoreUsers = await api.StoreUser.filter({ owner_email: cs.store_user_email });
                subStoreUsers.forEach(u => allowedEmails.push(u.user_email));
            }
        } catch(e) {}
        
        allowedEmails = [...new Set(allowedEmails)];

        const processEntityUpdates = async (entityName, processFn) => {
            try {
                let records = [];
                for (const email of allowedEmails) {
                    const r = await api[entityName].filter({ created_by: email });
                    if (r) records = [...records, ...r];
                }

                const uniqueRecords = Array.from(new Map(records.map(r => [r.id, r])).values());
                const updates = [];
                
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

        // 1. Recipes
        await processEntityUpdates('Recipe', (recipe) => {
            if (!recipe.ingredients) return null;
            let changed = false;
            const newIngredients = recipe.ingredients.map(ing => {
                if (ing.item_id === itemId && ing.item_name !== newName) {
                    changed = true;
                    return { ...ing, item_name: newName };
                }
                return ing;
            });
            return changed ? { ingredients: newIngredients } : null;
        });

        // 2. Orders
        await processEntityUpdates('Order', (order) => {
            if (!order.items) return null;
            let changed = false;
            const newItems = order.items.map(item => {
                if (item.item_id === itemId && item.item_name !== newName) {
                    changed = true;
                    return { ...item, item_name: newName };
                }
                return item;
            });
            return changed ? { items: newItems } : null;
        });

        // 3. SupplyReceipts
        await processEntityUpdates('SupplyReceipt', (receipt) => {
            if (!receipt.verified_items) return null;
            let changed = false;
            const newItems = receipt.verified_items.map(item => {
                if (item.item_id === itemId && item.item_name !== newName) {
                    changed = true;
                    return { ...item, item_name: newName };
                }
                return item;
            });
            return changed ? { verified_items: newItems } : null;
        });

        // 4. InventoryCounts
        await processEntityUpdates('InventoryCount', (count) => {
            if (!count.items) return null;
            let changed = false;
            const newItems = count.items.map(item => {
                if (item.item_id === itemId && item.item_name !== newName) {
                    changed = true;
                    return { ...item, item_name: newName };
                }
                return item;
            });
            return changed ? { items: newItems } : null;
        });

        // 5. WasteReports
        try {
            await processEntityUpdates('WasteReport', (report) => {
                if (!report.items) return null;
                let changed = false;
                const newItems = report.items.map(item => {
                    if (item.item_id === itemId && item.item_name !== newName) {
                        changed = true;
                        return { ...item, item_name: newName };
                    }
                    return item;
                });
                return changed ? { items: newItems } : null;
            });
        } catch (e) {}

        return Response.json({ success: true });
    } catch (error) {
        console.error('Update item details failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});