import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Find all refunds that are linked to an original receipt
        const allRefunds = await base44.asServiceRole.entities.SupplyReceipt.filter({ is_refund: true });
        const linkedRefunds = allRefunds.filter(r => r.linked_receipt_id);
        
        let fixedCount = 0;
        const fixedIds = [];

        for (const refund of linkedRefunds) {
            try {
                // Get the original receipt
                const originalReceipts = await base44.asServiceRole.entities.SupplyReceipt.filter({ id: refund.linked_receipt_id });
                if (originalReceipts.length > 0) {
                    const original = originalReceipts[0];
                    if (original.awaiting_credit || !original.refund_received) {
                        await base44.asServiceRole.entities.SupplyReceipt.update(original.id, {
                            awaiting_credit: false,
                            refund_received: true
                        });
                        fixedCount++;
                        fixedIds.push(original.id);
                    }
                }
            } catch (err) {
                console.error("Error updating receipt", refund.linked_receipt_id, err);
            }
        }

        return Response.json({ success: true, fixedCount, fixedIds });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});