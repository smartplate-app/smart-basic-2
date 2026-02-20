import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine which emails to export for (own + acting/store-owner when relevant)
    const sourceEmails = new Set<string>();
    if (user.email) sourceEmails.add(String(user.email));
    if (user.acting_as_store_email) sourceEmails.add(String(user.acting_as_store_email));
    if (user.store_user_owner_email) sourceEmails.add(String(user.store_user_owner_email));

    const emails = Array.from(sourceEmails);

    // Entities to export (focused, safe list)
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

    // Helper: unique by id
    const uniqById = (arr: any[]) => {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const r of arr || []) {
        const id = r && r.id ? String(r.id) : null;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(r);
      }
      return out;
    };

    // Fetch all entities in parallel across emails
    const results: Record<string, any[]> = {};
    await Promise.all(
      entityNames.map(async (name) => {
        try {
          const perEmail = await Promise.all(
            emails.map((e) => base44.entities[name as any].filter({ created_by: e }, '-created_date'))
          );
          results[name] = uniqById(perEmail.flat());
        } catch (e) {
          // If entity isn't present/accessible, just skip with empty list
          results[name] = [];
        }
      })
    );

    const totals: Record<string, number> = {};
    for (const k of Object.keys(results)) totals[k] = (results[k] || []).length;

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
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});