import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Admin-only data import for a new app. Expects payload from exportAllUserData.
// Optional flags:
//   dry_run: boolean (default false) -> don't write, just report counts
//   mirror_files: boolean (default false) -> reserved for future file re-uploading

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const bundle = body?.data || body?.bundle?.data || {};
    const dryRun = Boolean(body?.dry_run);

    const entityOrder = [
      'Chain',
      'ChainStore',
      'Supplier',
      'Item',
      'Worker',
      'JobPosition',
      'ScheduleTemplate',
      'WeeklySchedule',
      'InventoryCount',
      'InventoryTransfer',
      'Order',
      'SupplyReceipt',
      'PaymentTransaction',
      'MonthlyDashboardData',
      'WeeklySalesPrediction',
      'StoreUser',
      'WasteReport',
      'TipPolicy',
      'TipEntry',
      'WorkerRate',
      'HourlySalesReport'
    ];

    const sanitize = (rec) => {
      const { id, created_date, updated_date, created_by, created_by_id, ...rest } = rec || {};
      return rest;
    };

    const report = { inserted: {}, skipped: {}, errors: {} };

    for (const name of entityOrder) {
      const records = Array.isArray(bundle[name]) ? bundle[name] : [];
      if (!records.length) { report.inserted[name] = 0; continue; }

      const payload = records.map(sanitize);
      if (dryRun) { report.inserted[name] = payload.length; continue; }

      // Prefer bulkCreate if available; otherwise create sequentially
      try {
        const api = base44.asServiceRole.entities[name];
        if (typeof api.bulkCreate === 'function') {
          // Chunk to avoid payload limits
          const chunkSize = 100;
          let done = 0;
          for (let i = 0; i < payload.length; i += chunkSize) {
            const chunk = payload.slice(i, i + chunkSize);
            await api.bulkCreate(chunk);
            done += chunk.length;
          }
          report.inserted[name] = done;
        } else {
          let done = 0;
          for (const rec of payload) { await api.create(rec); done++; }
          report.inserted[name] = done;
        }
      } catch (e) {
        report.errors[name] = String(e?.message || e);
        report.inserted[name] = 0;
      }
    }

    // Note: created_by cannot be preserved; we keep business email fields intact.
    return Response.json({ success: true, dry_run: dryRun, report }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});