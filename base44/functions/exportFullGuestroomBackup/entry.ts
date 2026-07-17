import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = 'guestroom@smartplate.org';
    const query = {
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
        suppliers: await base44.asServiceRole.entities.Supplier.filter(query, '', 5000),
        items: await base44.asServiceRole.entities.Item.filter(query, '', 5000),
        orders: await base44.asServiceRole.entities.Order.filter(query, '', 5000),
        supply_receipts: await base44.asServiceRole.entities.SupplyReceipt.filter(query, '', 5000),
        warehouses: await base44.asServiceRole.entities.Warehouse.filter(query, '', 5000),
        inventory_counts: await base44.asServiceRole.entities.InventoryCount.filter(query, '', 5000)
      }
    };

    return Response.json(backupData);

  } catch (error) {
    console.error("Export error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});