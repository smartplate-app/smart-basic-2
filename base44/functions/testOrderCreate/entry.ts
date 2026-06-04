import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const order = await base44.asServiceRole.entities.Order.create({
            supplier_id: "123",
            supplier_name: "Test Supplier",
            delivery_date: "",
            restaurant_name: "Test Restaurant"
        });
        return Response.json({ success: true, order });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});