import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Collect relevant emails (own + acting/store-owner if applicable)
    const sourceEmails = new Set();
    if (user.email) sourceEmails.add(String(user.email));
    if (user.acting_as_store_email) sourceEmails.add(String(user.acting_as_store_email));
    if (user.store_user_owner_email) sourceEmails.add(String(user.store_user_owner_email));
    const emails = Array.from(sourceEmails);

    // Allowlist of entities to export
    const entityNames = [
      'Supplier',
      'Order',
      'SupplyReceipt',
      'Item',
      'InventoryCount',
      'InventoryTransfer',
      'WeeklySchedule',
      'Worker',
      'JobPosition',
      'PaymentTransaction',
      'MonthlyDashboardData',
      'WeeklySalesPrediction',
      'Chain',
      'ChainStore',
      'StoreUser',
      'WasteReport',
      'TipEntry',
      'TipPolicy',
      'WorkerRate',
      'ScheduleTemplate',
      'HourlySalesReport'
    ];

    const uniqById = (arr) => {
      const seen = new Set();
      const out = [];
      for (const r of arr || []) {
        const id = r && r.id ? String(r.id) : null;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(r);
      }
      return out;
    };

    const results = {};

    // Fetch data for each entity across all relevant emails
    await Promise.all(
      entityNames.map(async (name) => {
        try {
          const perEmailLists = await Promise.all(
            emails.map((e) => base44.entities[name].filter({ created_by: e }, '-created_date'))
          );
          results[name] = uniqById(perEmailLists.flat());
        } catch (_) {
          // Entity may not exist or user may not have access; default to []
          results[name] = [];
        }
      })
    );

    const totals = {};
    Object.keys(results).forEach((k) => { totals[k] = (results[k] || []).length; });

    const payload = {
      metadata: {
        generated_at: new Date().toISOString(),
        requested_by: user.email || null,
        sources: emails,
        app_version: 'export_v1'
      },
      totals,
      data: results
    };

    return Response.json(payload, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});