import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify service role or handle webhook safely
    const body = await req.json().catch(() => ({}));
    
    // We expect this to be called by an entity automation on SupplyReceipt creation
    // body structure: { event: { type, entity_name, entity_id }, data: { ... } }
    
    if (body?.event?.entity_name !== 'SupplyReceipt' || body?.event?.type !== 'create') {
      return Response.json({ success: true, ignored: true, reason: 'Not a SupplyReceipt creation' });
    }

    const receipt = body.data;
    if (!receipt) {
       return Response.json({ error: 'Missing receipt data' }, { status: 400 });
    }

    const linkedOrderIds = [receipt.order_id, ...(receipt.linked_order_ids || [])].filter(Boolean);
    
    if (linkedOrderIds.length === 0) {
      return Response.json({ success: true, ignored: true, reason: 'No linked orders' });
    }

    const updatedOrders = [];
    
    for (const orderId of linkedOrderIds) {
      const order = await base44.asServiceRole.entities.Order.get(orderId);
      if (!order) continue;
      
      const updated = await base44.asServiceRole.entities.Order.update(order.id, {
        status: 'delivered'
      });
      updatedOrders.push(updated);
    }

    return Response.json({ success: true, updatedCount: updatedOrders.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});