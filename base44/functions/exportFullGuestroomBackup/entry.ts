import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = 'moshiko@guestroomtlv.com';
    const filter = {
      $or: [
        { store_owner_email: email },
        { created_by: email }
      ]
    };

    // Export structure (Recipes omitted per user request)
    const backupData = {
      metadata: {
        export_date: new Date().toISOString(),
        user_email: email,
        store_name: "Guest Room TLV"
      },
      data: {
        suppliers: [],
        items: [],
        orders: [],
        supply_receipts: [],
        warehouses: [],
        inventory_counts: []
      }
    };

    // 1. Get Suppliers
    let hasMore = true;
    let offset = 0;
    const limit = 500;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Supplier.list('', limit, offset);
      const filtered = batch.filter(r => r.store_owner_email === email || r.created_by === email);
      backupData.data.suppliers.push(...filtered);
      if (batch.length < limit) hasMore = false;
      offset += limit;
    }

    // 2. Get Items
    hasMore = true; offset = 0;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Item.list('', limit, offset);
      const filtered = batch.filter(r => r.store_owner_email === email || r.created_by === email);
      backupData.data.items.push(...filtered);
      if (batch.length < limit) hasMore = false;
      offset += limit;
    }

    // 3. Get Orders
    hasMore = true; offset = 0;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Order.list('', limit, offset);
      const filtered = batch.filter(r => r.store_owner_email === email || r.created_by === email);
      backupData.data.orders.push(...filtered);
      if (batch.length < limit) hasMore = false;
      offset += limit;
    }

    // 4. Get Receipts
    hasMore = true; offset = 0;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.SupplyReceipt.list('', limit, offset);
      const filtered = batch.filter(r => r.store_owner_email === email || r.created_by === email);
      backupData.data.supply_receipts.push(...filtered);
      if (batch.length < limit) hasMore = false;
      offset += limit;
    }

    // 5. Get Warehouses
    hasMore = true; offset = 0;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.Warehouse.list('', limit, offset);
      const filtered = batch.filter(r => r.store_owner_email === email || r.created_by === email);
      backupData.data.warehouses.push(...filtered);
      if (batch.length < limit) hasMore = false;
      offset += limit;
    }

    // 6. Get Inventory Counts
    hasMore = true; offset = 0;
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.InventoryCount.list('', limit, offset);
      const filtered = batch.filter(r => r.store_owner_email === email || r.created_by === email);
      backupData.data.inventory_counts.push(...filtered);
      if (batch.length < limit) hasMore = false;
      offset += limit;
    }

    return Response.json(backupData);

  } catch (error) {
    console.error("Export error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});