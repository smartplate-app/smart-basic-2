import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both: called from automation (body.data.linked_receipt_id)
    // and called directly from frontend (body.linked_receipt_id)
    const linked_receipt_id = body.linked_receipt_id || body.data?.linked_receipt_id;

    if (!linked_receipt_id) {
      return Response.json({ success: false, error: 'no linked_receipt_id' });
    }

    // Only clear awaiting_credit on the original doc.
    // refund_received belongs on the credit/refund doc itself, NOT on the original.
    await base44.asServiceRole.entities.SupplyReceipt.update(linked_receipt_id, {
      awaiting_credit: false,
      reviewed: true,
      needs_review: false
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});