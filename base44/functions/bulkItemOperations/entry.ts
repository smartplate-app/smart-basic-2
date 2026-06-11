import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { action, itemIds, payload } = body;
        
        if (!itemIds || !Array.isArray(itemIds)) {
            return Response.json({ error: 'Invalid itemIds' }, { status: 400 });
        }

        const isOwnerOrAdmin = user.role === 'admin' || user.store_user_owner_email || user.acting_as_store_email;
        
        for (let i = 0; i < itemIds.length; i += 10) {
            const batch = itemIds.slice(i, i + 10);
            await Promise.all(batch.map(async (id) => {
                try {
                    if (action === 'delete') {
                        if (isOwnerOrAdmin) {
                            await base44.functions.invoke('deleteItemForStore', { itemId: id });
                        } else {
                            await base44.entities.Item.delete(id);
                        }
                    } else if (action === 'updateSupplier') {
                        await base44.asServiceRole.entities.Item.update(id, payload);
                    } else if (action === 'addWarehouses') {
                        const items = await base44.asServiceRole.entities.Item.filter({ id });
                        if (items && items.length > 0) {
                            const it = items[0];
                            let currentWids = [...(it.warehouse_ids || (it.warehouse_id ? [it.warehouse_id] : []))];
                            let currentWnames = [...(it.warehouse_names || (it.warehouse_name ? [it.warehouse_name] : []))];
                            let updated = false;
                            
                            const originalLen = currentWids.length;

                            (payload.targetWarehouses || []).forEach(wh => {
                                if (!currentWids.includes(wh.id)) {
                                    currentWids.push(wh.id);
                                    currentWnames.push(wh.name);
                                    updated = true;
                                }
                            });
                            
                            currentWids = currentWids.filter(wid => wid && typeof wid === 'string' && wid.trim() !== "");
                            currentWnames = currentWnames.filter(wname => wname && typeof wname === 'string' && wname.trim() !== "");

                            if (updated || currentWids.length !== originalLen) {
                                await base44.asServiceRole.entities.Item.update(id, {
                                    warehouse_ids: currentWids,
                                    warehouse_names: currentWnames,
                                    warehouse_id: currentWids.length > 0 ? currentWids[0] : "",
                                    warehouse_name: currentWnames.length > 0 ? currentWnames[0] : ""
                                });
                            }
                        }
                    } else if (action === 'removeWarehouse') {
                        const items = await base44.asServiceRole.entities.Item.filter({ id });
                        if (items && items.length > 0) {
                            const it = items[0];
                            let currentWids = [...(it.warehouse_ids || (it.warehouse_id ? [it.warehouse_id] : []))];
                            let currentWnames = [...(it.warehouse_names || (it.warehouse_name ? [it.warehouse_name] : []))];
                            if (currentWids.includes(payload.warehouseId)) {
                                const newWids = currentWids.filter(w => w && typeof w === 'string' && w !== payload.warehouseId && w.trim() !== "");
                                const newWnames = currentWnames.filter(w => w && typeof w === 'string' && w !== payload.warehouseName && w.trim() !== "");
                                await base44.asServiceRole.entities.Item.update(id, {
                                    warehouse_ids: newWids,
                                    warehouse_names: newWnames,
                                    warehouse_id: newWids.length > 0 ? newWids[0] : "",
                                    warehouse_name: newWnames.length > 0 ? newWnames[0] : ""
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error on item", id, e);
                    throw e; // Actually throw to fail the request
                }
            }));
            // small delay to prevent database limits
            await new Promise(r => setTimeout(r, 150));
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});