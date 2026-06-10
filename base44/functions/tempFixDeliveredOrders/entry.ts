import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const allReceipts = await base44.asServiceRole.entities.SupplyReceipt.list('-created_date', 1000);
    
    let updatedOrdersCount = 0;
    const details = [];
    
    // Find all linked order IDs
    const allLinkedOrderIds = new Set();
    for (const receipt of allReceipts) {
      if (receipt.order_id) {
        allLinkedOrderIds.add(receipt.order_id);
      }
      if (receipt.linked_order_ids && Array.isArray(receipt.linked_order_ids)) {
        for (const oid of receipt.linked_order_ids) {
          if (oid) allLinkedOrderIds.add(oid);
        }
      }
    }

    // Now update those orders if they are not already 'delivered'
    for (const oid of allLinkedOrderIds) {
      try {
        const order = await base44.asServiceRole.entities.Order.get(oid);
        if (order && order.status !== 'delivered') {
          await base44.asServiceRole.entities.Order.update(oid, { status: 'delivered' });
          updatedOrdersCount++;
          details.push(oid);
          await new Promise(r => setTimeout(r, 100)); // anti rate-limit
        }
      } catch (err) {
        // order doesn't exist
      }
    }

    return Response.json({ success: true, updatedOrdersCount, details });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});