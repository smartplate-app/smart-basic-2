import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all receipts
    const allReceipts = await base44.asServiceRole.entities.SupplyReceipt.list();
    
    // Find all refunds that have a linked_receipt_id
    const refundsWithLinks = allReceipts.filter(r => r.is_refund === true && r.linked_receipt_id);
    
    const updatedIds = [];
    
    for (const refund of refundsWithLinks) {
      const originalReceipt = allReceipts.find(r => r.id === refund.linked_receipt_id);
      
      if (originalReceipt && originalReceipt.awaiting_credit === true) {
        await base44.asServiceRole.entities.SupplyReceipt.update(originalReceipt.id, {
          awaiting_credit: false,
          reviewed: true,
          needs_review: false
        });
        updatedIds.push(originalReceipt.id);
      }
    }

    return Response.json({ success: true, updated_count: updatedIds.length, updated_ids: updatedIds });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});