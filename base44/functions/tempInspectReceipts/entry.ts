import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allReceipts = await base44.asServiceRole.entities.SupplyReceipt.list();
    
    const test5Receipts = allReceipts.filter(r => r.supplier_name === 'test 5');
    
    return Response.json({
      test5_count: test5Receipts.length,
      receipts: test5Receipts.map(r => ({
        id: r.id,
        invoice: r.invoice_number,
        is_refund: r.is_refund,
        awaiting_credit: r.awaiting_credit,
        linked_receipt_id: r.linked_receipt_id,
        refund_received: r.refund_received
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});