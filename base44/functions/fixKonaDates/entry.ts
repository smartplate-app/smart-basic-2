import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all SupplyReceipts for this user
    const receipts = await base44.asServiceRole.entities.SupplyReceipt.filter({
      created_by: 'konaburgerltd@gmail.com'
    });
    
    let updatedCount = 0;
    const updatedDetails = [];
    
    for (const r of receipts) {
      let needsUpdate = false;
      const updates = {};
      
      if (r.received_date && r.received_date.startsWith('2023')) {
        updates.received_date = r.received_date.replace('2023', '2026');
        needsUpdate = true;
      }
      
      if (r.invoice_date && r.invoice_date.startsWith('2023')) {
        updates.invoice_date = r.invoice_date.replace('2023', '2026');
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await base44.asServiceRole.entities.SupplyReceipt.update(r.id, updates);
        updatedCount++;
        updatedDetails.push({ id: r.id, oldReceived: r.received_date, oldInvoice: r.invoice_date, ...updates });
      }
    }
    
    return Response.json({ success: true, updatedCount, updatedDetails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});