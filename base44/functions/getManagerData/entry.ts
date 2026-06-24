import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Service-role data fetcher for managers acting on behalf of a store owner.
// Managers are stored in StoreUser with role='manager'. Their acting_as_store_email
// points to the owner's email. Since RLS blocks managers from reading owner's
// entity records directly, we use service role here after verifying the manager
// is legitimately assigned to that owner.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ownerEmail, entities: requestedEntities } = await req.json();

    if (!ownerEmail) {
      return Response.json({ error: 'ownerEmail is required' }, { status: 400 });
    }

    // Verify this user is actually a store user (manager or worker) for the given owner
    const storeUserRecords = await base44.asServiceRole.entities.StoreUser.filter({
      user_email: user.email,
      owner_email: ownerEmail,
      is_active: true
    });

    if (storeUserRecords.length === 0) {
      // Also allow admin
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: not a store user for this owner' }, { status: 403 });
      }
    }

    const result = {};
    const entitiesToFetch = requestedEntities || ['suppliers', 'items', 'orders', 'receipts', 'warehouses', 'recipes', 'inventoryCounts', 'wasteReports', 'dashboardData', 'schedules'];

    const filters = [
      { created_by: ownerEmail },
      { store_owner_email: ownerEmail }
    ];

    const fetchBoth = async (entityName) => {
      const [r1, r2] = await Promise.all([
        base44.asServiceRole.entities[entityName].filter({ created_by: ownerEmail }, "-created_date", 10000),
        base44.asServiceRole.entities[entityName].filter({ store_owner_email: ownerEmail }, "-created_date", 10000)
      ]);
      const combined = [...(r1 || []), ...(r2 || [])];
      const deduped = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      // For Warehouse: only return active warehouses to avoid returning stale/test records
      if (entityName === 'Warehouse') {
        return deduped.filter(w => w.is_active !== false);
      }
      return deduped;
    };

    await Promise.all([
      entitiesToFetch.includes('suppliers') && fetchBoth('Supplier').then(d => result.suppliers = d),
      entitiesToFetch.includes('items') && fetchBoth('Item').then(d => result.items = d),
      entitiesToFetch.includes('orders') && fetchBoth('Order').then(d => result.orders = d),
      entitiesToFetch.includes('receipts') && fetchBoth('SupplyReceipt').then(d => result.receipts = d),
      entitiesToFetch.includes('warehouses') && base44.asServiceRole.entities.Warehouse.filter({ created_by: ownerEmail }, "-created_date", 10000).then(d => result.warehouses = (d || []).filter(w => w.is_active !== false)),
      entitiesToFetch.includes('recipes') && fetchBoth('Recipe').then(d => result.recipes = d),
      entitiesToFetch.includes('inventoryCounts') && fetchBoth('InventoryCount').then(d => result.inventoryCounts = d),
      entitiesToFetch.includes('wasteReports') && fetchBoth('WasteReport').then(d => result.wasteReports = d),
      entitiesToFetch.includes('dashboardData') && fetchBoth('MonthlyDashboardData').then(d => result.dashboardData = d),
      entitiesToFetch.includes('schedules') && fetchBoth('WeeklySchedule').then(d => result.schedules = d),
      entitiesToFetch.includes('cogsReports') && fetchBoth('CogsReport').then(d => result.cogsReports = d),
      entitiesToFetch.includes('priceChangeLogs') && fetchBoth('PriceChangeLog').then(d => result.priceChangeLogs = d),
    ].filter(Boolean));

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('getManagerData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});