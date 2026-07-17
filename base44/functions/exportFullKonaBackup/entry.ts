import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Ensure only admins can trigger this migration export
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetEmail = 'konaburgerltd@gmail.com';
    const query = {
      $or: [
        { store_owner_email: targetEmail },
        { created_by: targetEmail }
      ]
    };

    // Fetch all relevant data for Kona
    const [suppliers, items, recipes, orders, receipts, warehouses] = await Promise.all([
      base44.asServiceRole.entities.Supplier.filter(query, '', 10000),
      base44.asServiceRole.entities.Item.filter(query, '', 10000),
      base44.asServiceRole.entities.Recipe.filter(query, '', 10000),
      base44.asServiceRole.entities.Order.filter(query, '', 10000),
      base44.asServiceRole.entities.SupplyReceipt.filter(query, '', 10000),
      base44.asServiceRole.entities.Warehouse.filter(query, '', 10000)
    ]);

    const backupData = {
      metadata: {
        export_date: new Date().toISOString(),
        target_email: targetEmail
      },
      data: {
        suppliers,
        items,
        recipes,
        orders,
        receipts,
        warehouses
      }
    };

    // Return as JSON
    return Response.json(backupData);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});