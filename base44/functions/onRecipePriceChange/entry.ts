import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { event, data, old_data, changed_fields } = payload;
        
        if (event?.type !== 'update' || !data || !old_data) {
            return Response.json({ message: "Not an update event" });
        }

        const base44 = createClientFromRequest(req);

        let created = false;

        // Check for sale price change
        if (changed_fields && changed_fields.includes("sale_price")) {
            const oldSalePrice = Number(old_data.sale_price || 0);
            const newSalePrice = Number(data.sale_price || 0);
            if (oldSalePrice !== newSalePrice) {
                await base44.asServiceRole.entities.PriceChangeLog.create({
                    item_type: "recipe",
                    item_id: data.id,
                    item_name: data.name,
                    change_type: "sale_price",
                    old_price: oldSalePrice,
                    new_price: newSalePrice,
                    created_by: data.created_by
                });
                created = true;
            }
        }
        
        // Check for total_cost change
        if (changed_fields && changed_fields.includes("total_cost")) {
            const oldTotalCost = Number(old_data.total_cost || 0);
            const newTotalCost = Number(data.total_cost || 0);
            if (oldTotalCost !== newTotalCost) {
                await base44.asServiceRole.entities.PriceChangeLog.create({
                    item_type: "recipe",
                    item_id: data.id,
                    item_name: data.name,
                    change_type: "cost",
                    old_price: oldTotalCost,
                    new_price: newTotalCost,
                    created_by: data.created_by
                });
                created = true;
            }
        }

        return Response.json({ success: true, created });
    } catch (error) {
        console.error('onRecipePriceChange failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});