import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// One-time backfill: for each Item with source_type='supply_receipt' and missing source_document_id,
// find the matching SupplyReceipt by invoice_number/order_number and set source_document_id.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all items missing source_document_id but with source_type=supply_receipt
    const allItems = await base44.asServiceRole.entities.Item.filter({ source_type: 'supply_receipt' }, '-created_date', 5000);
    const itemsToFix = allItems.filter(i => !i.source_document_id && i.source_document_number);

    if (itemsToFix.length === 0) {
      return Response.json({ success: true, message: 'No items need fixing', fixed: 0 });
    }

    // Get all supply receipts (service role)
    const allReceipts = await base44.asServiceRole.entities.SupplyReceipt.list('-created_date', 10000);

    // Build a lookup: invoice_number -> receipt id, also order_number -> receipt id
    const byInvoice = {};
    const byOrder = {};
    for (const r of allReceipts) {
      if (r.invoice_number) {
        const key = `${r.invoice_number}__${r.supplier_id || ''}`;
        if (!byInvoice[key]) byInvoice[key] = r.id;
        // Also index without supplier for fuzzy match
        if (!byInvoice[r.invoice_number]) byInvoice[r.invoice_number] = r.id;
      }
      if (r.order_number) {
        if (!byOrder[r.order_number]) byOrder[r.order_number] = r.id;
      }
    }

    let fixed = 0;
    let notFound = 0;
    const details = [];

    for (const item of itemsToFix) {
      const docNum = item.source_document_number;
      // Try invoice number match first (with supplier scope), then plain, then order number
      const receiptId = 
        byInvoice[`${docNum}__${item.supplier_id || ''}`] ||
        byInvoice[docNum] ||
        byOrder[docNum];

      if (receiptId) {
        await base44.asServiceRole.entities.Item.update(item.id, { source_document_id: receiptId });
        fixed++;
        details.push({ item_id: item.id, item_name: item.name, receipt_id: receiptId, doc_num: docNum });
      } else {
        notFound++;
        details.push({ item_id: item.id, item_name: item.name, doc_num: docNum, status: 'not_found' });
      }
    }

    return Response.json({ 
      success: true, 
      total: itemsToFix.length,
      fixed, 
      notFound,
      details: details.slice(0, 100)
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});