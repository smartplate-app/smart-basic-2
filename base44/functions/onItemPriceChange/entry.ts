import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const { event, data, old_data, changed_fields } = payload;
        
        if (event?.type !== 'update' || !data || !old_data) {
            return Response.json({ message: "Not an update event" });
        }

        if (!changed_fields || !changed_fields.includes("price_after_discount")) {
            return Response.json({ message: "Price did not change" });
        }
        
        const oldPrice = Number(old_data.price_after_discount || 0);
        const newPrice = Number(data.price_after_discount || 0);
        
        if (oldPrice === newPrice) {
            return Response.json({ message: "Price is identical" });
        }

        const base44 = createClientFromRequest(req);
        
        await base44.asServiceRole.entities.PriceChangeLog.create({
            item_type: "item",
            item_id: data.id,
            item_name: data.name,
            change_type: "cost",
            old_price: oldPrice,
            new_price: newPrice,
            created_by: data.created_by
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error('onItemPriceChange failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});