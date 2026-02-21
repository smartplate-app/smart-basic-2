import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Relevant creator emails (own + acting/store-owner if applicable)
    const emailSet = new Set();
    if (user.email) emailSet.add(String(user.email));
    if (user.acting_as_store_email) emailSet.add(String(user.acting_as_store_email));
    if (user.store_user_owner_email) emailSet.add(String(user.store_user_owner_email));
    const emails = Array.from(emailSet);

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
    await Promise.all(
      entityNames.map(async (name) => {
        try {
          const perEmail = await Promise.all(
            emails.map((e) => base44.entities[name].filter({ created_by: e }, '-created_date'))
          );
          results[name] = uniqById(perEmail.flat());
        } catch (_) {
          results[name] = [];
        }
      })
    );

    const manifest = [];

    const pushIfUrl = (entity, id, field, url, extra = {}) => {
      try {
        if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
          const fname = (() => {
            try { const u = new URL(url); return decodeURIComponent(u.pathname.split('/').pop() || 'file'); } catch { return 'file'; }
          })();
          manifest.push({ entity, id, field, url, filename: fname, ...extra });
        }
      } catch {}
    };

    for (const [entity, list] of Object.entries(results)) {
      for (const rec of list) {
        const id = rec.id;
        // Known explicit fields
        if (entity === 'Supplier') {
          pushIfUrl(entity, id, 'grant_document_url', rec.grant_document_url);
        }
        if (entity === 'SupplyReceipt') {
          if (Array.isArray(rec.receipt_images)) {
            rec.receipt_images.forEach((u, idx) => pushIfUrl(entity, id, 'receipt_images', u, { index: idx }));
          }
        }
        if (entity === 'InventoryCount') {
          if (Array.isArray(rec.screenshot_urls)) {
            rec.screenshot_urls.forEach((u, idx) => pushIfUrl(entity, id, 'screenshot_urls', u, { index: idx }));
          }
        }

        // Generic patterns: any field with 'url' in key
        for (const [k, v] of Object.entries(rec)) {
          if (typeof v === 'string' && /url/i.test(k)) {
            pushIfUrl(entity, id, k, v);
          }
          if (Array.isArray(v) && /urls?/i.test(k)) {
            v.forEach((val, idx) => pushIfUrl(entity, id, k, val, { index: idx }));
          }
        }
      }
    }

    return Response.json({ total: manifest.length, items: manifest }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});