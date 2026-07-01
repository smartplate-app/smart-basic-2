import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const storeEmail = 'guestroom@smartplate.org';
    
    // Helper function to fetch all records using pagination
    async function fetchAll(entityName, query) {
      let allRecords = [];
      let skip = 0;
      const limit = 500;
      let hasMore = true;
      
      while (hasMore) {
        const response = await base44.asServiceRole.entities[entityName].filter(query, '', limit, skip);
        if (response && response.length > 0) {
          allRecords = allRecords.concat(response);
          skip += response.length;
          if (response.length < limit) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      return allRecords;
    }

    // 1 & 2 & 3. Fetch ALL Supplier, Item, and InventoryCount records
    const suppliers = await fetchAll('Supplier', { store_owner_email: storeEmail });
    const items = await fetchAll('Item', { store_owner_email: storeEmail });
    const inventoryCounts = await fetchAll('InventoryCount', { store_owner_email: storeEmail });

    const payload = {
      storeEmail,
      suppliers,
      items,
      inventoryCounts
    };

    // 4. Send POST request
    const response = await fetch('https://smart-plate-guestroom.base44.app/api/functions/migrateGuestroomCatalog', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Migration API error: ${response.status} ${errText}`);
    }

    // 5. Return success and counts
    return Response.json({ 
      success: true, 
      suppliersCount: suppliers.length, 
      itemsCount: items.length,
      inventoryCountsCount: inventoryCounts.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});