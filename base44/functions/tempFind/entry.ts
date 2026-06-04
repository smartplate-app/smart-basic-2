import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const entitiesToFix = [
      'Item', 'Supplier', 'Order', 'SupplyReceipt', 
      'Recipe', 'InventoryCount', 'CogsReport', 'Warehouse'
    ];
    
    let totalFixed = 0;
    const fixDetails = {};
    
    for (const entityName of entitiesToFix) {
      // Get all records where store_owner_email is currently office@smartplate.biz
      const records = await base44.asServiceRole.entities[entityName].filter({
        store_owner_email: 'office@smartplate.biz'
      });
      
      let fixedForEntity = 0;
      for (const record of records) {
        // If created_by is NOT admin, service, or office, it was mistakenly reassigned to office.
        // It should be assigned to the original creator (or null, but let's assign to creator).
        const creator = record.created_by;
        if (creator && 
            creator !== 'office@smartplate.biz' && 
            creator !== 'admin@smartplate.org' && 
            !creator.startsWith('service+') &&
            creator !== 'studioaka55@gmail.com') { // Nitsan is admin too
            
            // Revert back or assign to the creator
            await base44.asServiceRole.entities[entityName].update(record.id, {
              store_owner_email: creator
            });
            fixedForEntity++;
            totalFixed++;
        }
      }
      fixDetails[entityName] = fixedForEntity;
    }
    
    return Response.json({ success: true, totalFixed, fixDetails });
  } catch (e) {
    return Response.json({ error: e.message });
  }
});