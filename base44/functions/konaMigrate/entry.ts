import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const OWNER_EMAIL = "konaburgerltd@gmail.com";
const TARGET_APP_ID = "6a2b22afda59625767deb851";
const TARGET_API = `https://app.base44.com/api/apps/${TARGET_APP_ID}/entities`;

function strip(record) {
  const { id, created_date, updated_date, created_by_id, ...rest } = record;
  return rest;
}

async function writeToTarget(token, entityName, record) {
  const res = await fetch(`${TARGET_API}/${entityName}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`${entityName} write failed: ${res.status} ${t.slice(0,200)}`); }
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
    const log = [];
    const idMap = { Supplier: {}, Item: {}, Recipe: {} };

    async function readAll(entityName, query = {}) {
      const all = [];
      let skip = 0;
      while (true) {
        const res = await base44.asServiceRole.entities[entityName].filter({ ...query, _limit: 500, _skip: skip });
        const batch = Array.isArray(res) ? res : (res.records || []);
        all.push(...batch);
        const more = Array.isArray(res) ? batch.length === 500 : res.has_more;
        if (!more || batch.length === 0) break;
        skip += 500;
        if (all.length > 5000) break;
      }
      return all;
    }

    // 1. Suppliers
    const suppliers = await readAll("Supplier", { store_owner_email: OWNER_EMAIL });
    log.push({ entity: "Supplier", count: suppliers.length });
    if (!dryRun) {
      let m = 0;
      for (const s of suppliers) {
        try { const c = await writeToTarget(token, "Supplier", strip(s)); idMap.Supplier[s.id] = c.id; m++; } catch(e) { log[log.length-1].errors = [...(log[log.length-1].errors||[]), e.message.slice(0,100)]; }
      }
      log[log.length-1].migrated = m;
    }

    // 2. Items
    const items = await readAll("Item", { store_owner_email: OWNER_EMAIL });
    log.push({ entity: "Item", count: items.length });
    if (!dryRun) {
      let m = 0;
      for (const item of items) {
        const c = strip(item);
        if (c.supplier_id && idMap.Supplier[c.supplier_id]) c.supplier_id = idMap.Supplier[c.supplier_id];
        c.source_document_id = null;
        try { const cr = await writeToTarget(token, "Item", c); idMap.Item[item.id] = cr.id; m++; } catch(e) {}
      }
      log[log.length-1].migrated = m;
    }

    // 3. Recipes
    const recipes = await readAll("Recipe", { store_owner_email: OWNER_EMAIL });
    log.push({ entity: "Recipe", count: recipes.length });
    if (!dryRun) {
      let m = 0;
      for (const r of recipes) {
        const c = strip(r);
        if (Array.isArray(c.ingredients)) c.ingredients = c.ingredients.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { const cr = await writeToTarget(token, "Recipe", c); idMap.Recipe[r.id] = cr.id; m++; } catch(e) {}
      }
      log[log.length-1].migrated = m;
    }

    // 4. Orders
    const orders = await readAll("Order", { store_owner_email: OWNER_EMAIL });
    log.push({ entity: "Order", count: orders.length });
    if (!dryRun) {
      let m = 0;
      for (const o of orders) {
        const c = strip(o);
        if (c.supplier_id && idMap.Supplier[c.supplier_id]) c.supplier_id = idMap.Supplier[c.supplier_id];
        if (Array.isArray(c.items)) c.items = c.items.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { await writeToTarget(token, "Order", c); m++; } catch(e) {}
      }
      log[log.length-1].migrated = m;
    }

    // 5. SupplyReceipts
    const receipts = await readAll("SupplyReceipt", { store_owner_email: OWNER_EMAIL });
    log.push({ entity: "SupplyReceipt", count: receipts.length });
    if (!dryRun) {
      let m = 0;
      for (const r of receipts) {
        const c = strip(r);
        if (c.supplier_id && idMap.Supplier[c.supplier_id]) c.supplier_id = idMap.Supplier[c.supplier_id];
        if (Array.isArray(c.items)) c.items = c.items.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { await writeToTarget(token, "SupplyReceipt", c); m++; } catch(e) {}
      }
      log[log.length-1].migrated = m;
    }

    // 6. InventoryCount
    const counts = await readAll("InventoryCount", { store_owner_email: OWNER_EMAIL });
    log.push({ entity: "InventoryCount", count: counts.length });
    if (!dryRun) {
      let m = 0;
      for (const co of counts) {
        const c = strip(co);
        if (Array.isArray(c.items)) c.items = c.items.map((i) => ({ ...i, item_id: idMap.Item[i.item_id] || i.item_id }));
        try { await writeToTarget(token, "InventoryCount", c); m++; } catch(e) {}
      }
      log[log.length-1].migrated = m;
    }

    return Response.json({ success: true, dry_run: dryRun, summary: log, message: dryRun ? "Dry run OK" : "Migration complete" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});