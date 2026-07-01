import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Public function, no auth check needed as requested
    
    const storeEmail = "guestroom@smartplate.org";

    // 1. Fetch all Suppliers with pagination
    let allSuppliers = [];
    let skipSuppliers = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Supplier.filter({ store_owner_email: storeEmail }, '', 500, skipSuppliers);
      allSuppliers = allSuppliers.concat(batch);
      if (batch.length < 500) break;
      skipSuppliers += 500;
    }

    // 2. Fetch all Items with pagination
    let allItems = [];
    let skipItems = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Item.filter({ store_owner_email: storeEmail }, '', 500, skipItems);
      allItems = allItems.concat(batch);
      if (batch.length < 500) break;
      skipItems += 500;
    }

    // 3. Send data to the new app
    const targetUrl = "https://smart-plate-guestroom.base44.app/api/functions/migrateGuestroomCatalog";
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        storeEmail: storeEmail,
        suppliers: allSuppliers,
        items: allItems
      })
    });

    let remoteResult = null;
    if (response.ok) {
      try {
        remoteResult = await response.json();
      } catch (e) {
        remoteResult = await response.text();
      }
    } else {
      const errorText = await response.text();
      throw new Error(`Target API returned ${response.status}: ${errorText}`);
    }

    // 4. Return success and counts
    return Response.json({
      success: true,
      suppliersCount: allSuppliers.length,
      itemsCount: allItems.length,
      remoteResult
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});