import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    
    if (body?.event?.entity_name !== 'SupplyReceipt' || body?.event?.type !== 'create') {
      return Response.json({ success: true, ignored: true, reason: 'Not a SupplyReceipt creation' });
    }

    const receipt = body.data;
    const receiptId = body?.event?.entity_id;
    if (!receipt) {
       return Response.json({ error: 'Missing receipt data' }, { status: 400 });
    }

    // 1. Update linked orders to 'delivered'
    const linkedOrderIds = [receipt.order_id, ...(receipt.linked_order_ids || [])].filter(Boolean);
    const updatedOrders = [];
    for (const orderId of linkedOrderIds) {
      const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
      if (!order) continue;
      const updated = await base44.asServiceRole.entities.Order.update(order.id, { status: 'delivered' });
      updatedOrders.push(updated);
    }

    // 2. Back-fill source_document_id on items that were created during this receipt
    //    but don't yet have source_document_id set.
    //    We identify them by: source_type='supply_receipt' AND source_document_id is missing/empty
    //    AND source_document_number matches the receipt's invoice_number or order_number.
    if (receiptId) {
      const docNumber = receipt.invoice_number || receipt.order_number || '';
      const workingEmail = receipt.created_by || receipt.store_owner_email;
      
      if (docNumber && workingEmail) {
        // Find items created for this receipt that are missing source_document_id
        const candidateItems = await base44.asServiceRole.entities.Item.filter({
          source_type: 'supply_receipt',
          source_document_number: docNumber,
          created_by: workingEmail
        }).catch(() => []);

        const itemsToUpdate = candidateItems.filter(item => !item.source_document_id);
        
        for (const item of itemsToUpdate) {
          await base44.asServiceRole.entities.Item.update(item.id, {
            source_document_id: receiptId
          }).catch(e => console.error('Failed to update item source_document_id:', item.id, e?.message));
        }

        return Response.json({ 
          success: true, 
          updatedOrders: updatedOrders.length, 
          updatedItemSources: itemsToUpdate.length 
        });
      }
    }

    return Response.json({ success: true, updatedOrders: updatedOrders.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});