import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { linked_receipt_id } = await req.json();

    if (!linked_receipt_id) {
      return Response.json({ success: false, error: 'linked_receipt_id is required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.SupplyReceipt.update(linked_receipt_id, {
      awaiting_credit: false,
      refund_received: true,
      reviewed: true,
      needs_review: false
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});