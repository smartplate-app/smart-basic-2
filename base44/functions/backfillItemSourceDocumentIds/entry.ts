import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Target ALL items requiring completion (supplier_id === 'pending') that are missing source_document_id
    // This handles both new items with source_type and older ones that defaulted to 'manual'
    const pendingItems = await base44.asServiceRole.entities.Item.filter({ supplier_id: 'pending' }, '-created_date', 200);
    const itemsToFix = pendingItems.filter(i => !i.source_document_id);

    if (itemsToFix.length === 0) {
      return Response.json({ success: true, message: 'No pending items need fixing', fixed: 0 });
    }

    let fixed = 0;
    let notFound = 0;
    const details = [];

    // Load all documents that could be sources
    const allCounts = await base44.asServiceRole.entities.InventoryCount.list('-created_date', 200);
    const allReceipts = await base44.asServiceRole.entities.SupplyReceipt.list('-created_date', 200);

    for (const item of itemsToFix) {
      let matchedDocId = null;
      let matchedType = null;
      let matchedDocNumber = null;

      // 1. Check Inventory Counts (if the item exists in the count's items array)
      const countMatch = allCounts.find(c => c.items && c.items.some(ci => ci.item_id === item.id));
      if (countMatch) {
        matchedDocId = countMatch.id;
        matchedType = 'inventory_count';
        matchedDocNumber = countMatch.name || countMatch.count_date || 'ספירת מלאי';
      } else {
        // 2. Check Supply Receipts (if the item exists in verified_items)
        const receiptMatch = allReceipts.find(r => r.verified_items && r.verified_items.some(vi => vi.item_id === item.id));
        if (receiptMatch) {
          matchedDocId = receiptMatch.id;
          matchedType = 'supply_receipt';
          matchedDocNumber = receiptMatch.invoice_number || receiptMatch.order_number || 'קבלת אספקה';
        }
      }

      // 3. Fallback: if we still don't know but we know the user who created it, 
      // check if there's an 'in_progress' count they created recently.
      if (!matchedDocId && item.created_by) {
        const fallbackCount = allCounts.find(c => c.created_by === item.created_by && c.status === 'in_progress');
        if (fallbackCount) {
          matchedDocId = fallbackCount.id;
          matchedType = 'inventory_count';
          matchedDocNumber = fallbackCount.name || fallbackCount.count_date || 'ספירת מלאי';
        }
      }

      if (matchedDocId) {
        await base44.asServiceRole.entities.Item.update(item.id, { 
          source_document_id: matchedDocId,
          source_type: matchedType,
          source_document_number: matchedDocNumber
        });
        fixed++;
        details.push({ item_id: item.id, item_name: item.name, matched_doc_id: matchedDocId, matched_type: matchedType });
        await new Promise(resolve => setTimeout(resolve, 250)); // rate limit prevention
      } else {
        notFound++;
        details.push({ item_id: item.id, item_name: item.name, status: 'not_found' });
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