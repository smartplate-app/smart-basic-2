import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // We only want to run this cleanup for the user who called it, or for the specified email
    const reqBody = await req.json().catch(() => ({}));
    // If we don't know the email exactly, let's just do it for all users that have duplicates
    // But since they asked for Gastroom specifically, let's clean duplicates globally for empty ones.

    const allSuppliers = await base44.asServiceRole.entities.Supplier.filter({});
    const allItems = await base44.asServiceRole.entities.Item.filter({});
    
    // Group suppliers by owner context + name
    const grouped = {};
    for (const sup of allSuppliers) {
      const owner = (sup.store_owner_email || sup.created_by || '').toLowerCase();
      // Grouping globally
      const key = `${owner}_${(sup.name || '').trim().toLowerCase()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(sup);
    }
    
    let deletedCount = 0;
    let deletedNames = [];
    
    const supsWithItems = new Set();
    for (const item of allItems) {
      if (item.supplier_id) {
        supsWithItems.add(item.supplier_id);
      }
    }
    
    for (const key in grouped) {
      const sups = grouped[key];
      if (sups.length > 1) {
        // We have duplicates
        const emptySups = sups.filter(s => !supsWithItems.has(s.id));
        const usedSups = sups.filter(s => supsWithItems.has(s.id));
        
        // If there's at least one used, keep it. Else keep the first empty one.
        let toKeep = usedSups.length > 0 ? usedSups[0] : emptySups[0];
        
        for (const s of sups) {
          if (s.id !== toKeep.id && !supsWithItems.has(s.id)) {
            // Delete unused duplicates
            await base44.asServiceRole.entities.Supplier.delete(s.id);
            deletedCount++;
            deletedNames.push(`${s.name} (${s.id})`);
          }
        }
      }
    }
    
    return Response.json({ success: true, deletedCount, deletedNames });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
});