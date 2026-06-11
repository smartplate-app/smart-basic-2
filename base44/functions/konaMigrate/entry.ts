import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const OWNER_EMAIL = "konaburgerltd@gmail.com";
const SOURCE_APP_ID = "699c4d19592434b7f867b2c6";
const TARGET_APP_ID = "6a2b22afda59625767deb851";
const API_BASE = "https://app.base44.com/api/apps";

function strip(record) {
  const { id, created_date, updated_date, created_by_id, ...rest } = record;
  return rest;
}

async function fetchAll(token, appId, entityName, filterQuery = {}) {
  const all = [];
  let skip = 0;
  const limit = 500;
  while (true) {
    const params = new URLSearchParams({ ...filterQuery, _limit: String(limit), _skip: String(skip) });
    const res = await fetch(`${API_BASE}/${appId}/entities/${entityName}?${params}`, {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error(`Read ${entityName} failed: ${res.status} ${(await res.text()).slice(0,200)}`);
    const data = await res.json();
    const batch = Array.isArray(data) ? data : (data.records || []);
    all.push(...batch);
    const more = Array.isArray(data) ? batch.length === limit : data.has_more;
    if (!more || batch.length === 0) break;
    skip += limit;
    if (all.length >= 5000) break;
  }
  return all;
}

async function postOne(token, appId, entityName, record) {
  const res = await fetch(`${API_BASE}/${appId}/entities/${entityName}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`Write ${entityName} failed: ${res.status} ${(await res.text()).slice(0,200)}`);
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;
    const token = Deno.env.get("BASE44_SERVICE_TOKEN") || "";

    if (!token) return Response.json({ error: "No service token" }, { status: 500 });

    const log = [];
    const idMap = { Supplier: {}, Item: {}, Recipe: {} };
    const Q = { created_by: OWNER_EMAIL };

    // 1. Suppliers
    const suppliers = await fetchAll(token, SOURCE_APP_ID, "Supplier", Q);
    log.push({ entity: "Supplier", found: suppliers.length });
    if (!dryRun) {
      let m = 0, errs = [];
      for (const s of suppliers) {
        try { const c = await postOne(token, TARGET_APP_ID, "Supplier", strip(s)); idMap.Supplier[s.id] = c.id; m++; }
        catch(e) { errs.push(e.message.slice(0,80)); }
      }
      log[log.length-1].migrated = m;
      if (errs.length) log[log.length-1].errors = errs;
    }

    // 2. Items
    const items = await fetchAll(token, SOURCE_APP_ID, "Item", Q);
    log.push({ entity: "Item", found: items.length });
    if (!dryRun) {
      let m = 0, errs = [];
      for (const item of items) {
        const c = strip(item);
        if (c.supplier_id && idMap.Supplier[c.supplier_id]) c.supplier_id = idMap.Supplier[c.supplier_id];
        c.source_document_id = null;
        try { const cr = await postOne(token, TARGET_APP_ID, "Item", c); idMap.Item[item.id] = cr.id; m++; }
        catch(e) { errs.push(e.message.slice(0,80)); }
      }
      log[log.length-1].migrated = m;
      if (errs.length) log[log.length-1].errors = errs;
    }

    // 3. Recipes
    const recipes = await fetchAll(token, SOURCE_APP_ID, "Recipe", Q);
    log.push({ entity: "Recipe", found: recipes.length });
    if (!dryRun) {
      let m = 0, errs = [];
      for (const r of recipes) {
        const c = strip(r);
        if (Array.isArray(c.ingredients)) c.ingredients = c.ingredients.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { const cr = await postOne(token, TARGET_APP_ID, "Recipe", c); idMap.Recipe[r.id] = cr.id; m++; }
        catch(e) { errs.push(e.message.slice(0,80)); }
      }
      log[log.length-1].migrated = m;
      if (errs.length) log[log.length-1].errors = errs;
    }

    // 4. Orders
    const orders = await fetchAll(token, SOURCE_APP_ID, "Order", Q);
    log.push({ entity: "Order", found: orders.length });
    if (!dryRun) {
      let m = 0, errs = [];
      for (const o of orders) {
        const c = strip(o);
        if (c.supplier_id && idMap.Supplier[c.supplier_id]) c.supplier_id = idMap.Supplier[c.supplier_id];
        if (Array.isArray(c.items)) c.items = c.items.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { await postOne(token, TARGET_APP_ID, "Order", c); m++; }
        catch(e) { errs.push(e.message.slice(0,80)); }
      }
      log[log.length-1].migrated = m;
      if (errs.length) log[log.length-1].errors = errs;
    }

    // 5. SupplyReceipts
    const receipts = await fetchAll(token, SOURCE_APP_ID, "SupplyReceipt", Q);
    log.push({ entity: "SupplyReceipt", found: receipts.length });
    if (!dryRun) {
      let m = 0, errs = [];
      for (const r of receipts) {
        const c = strip(r);
        if (c.supplier_id && idMap.Supplier[c.supplier_id]) c.supplier_id = idMap.Supplier[c.supplier_id];
        if (Array.isArray(c.items)) c.items = c.items.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { await postOne(token, TARGET_APP_ID, "SupplyReceipt", c); m++; }
        catch(e) { errs.push(e.message.slice(0,80)); }
      }
      log[log.length-1].migrated = m;
      if (errs.length) log[log.length-1].errors = errs;
    }

    // 6. InventoryCount
    const counts = await fetchAll(token, SOURCE_APP_ID, "InventoryCount", Q);
    log.push({ entity: "InventoryCount", found: counts.length });
    if (!dryRun) {
      let m = 0, errs = [];
      for (const co of counts) {
        const c = strip(co);
        if (Array.isArray(c.items)) c.items = c.items.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { await postOne(token, TARGET_APP_ID, "InventoryCount", c); m++; }
        catch(e) { errs.push(e.message.slice(0,80)); }
      }
      log[log.length-1].migrated = m;
      if (errs.length) log[log.length-1].errors = errs;
    }

    return Response.json({ success: true, dry_run: dryRun, summary: log, message: dryRun ? "Dry run OK — nothing written" : "Migration complete ✅" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});