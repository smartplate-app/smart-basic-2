import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
      const records = await base44.asServiceRole.entities[entityName].filter({
        store_owner_email: 'office@smartplate.biz'
      });
      
      let fixedForEntity = 0;
      for (const record of records) {
        const creator = record.created_by;
        if (creator && 
            creator !== 'office@smartplate.biz' && 
            creator !== 'admin@smartplate.org' && 
            !creator.startsWith('service+') &&
            creator !== 'studioaka55@gmail.com') {
            
            await base44.asServiceRole.entities[entityName].update(record.id, {
              store_owner_email: creator
            });
            fixedForEntity++;
            totalFixed++;
            
            // Wait 20ms to avoid rate limits (50 req/sec)
            await sleep(20);
        }
      }
      fixDetails[entityName] = fixedForEntity;
    }
    
    return Response.json({ success: true, totalFixed, fixDetails });
  } catch (e) {
    return Response.json({ error: e.message });
  }
});