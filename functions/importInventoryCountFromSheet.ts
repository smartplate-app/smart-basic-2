import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function sheetsRequest(accessToken, path, { method = 'GET', query = {}, headers = {}, body } = {}) {
  const url = new URL(`https://sheets.googleapis.com${path}`);
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)); });
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`Sheets ${method} ${path} failed (${res.status}): ${txt}`); }
  return await res.json();
}

function extractSheetId(input) {
  if (!input) return '';
  try {
    const url = new URL(input);
    const m = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : input;
  } catch {
    return input; // maybe already an ID
  }
}

function toNumber(v) { const n = Number(String(v||'').replace(/,/g,'.')); return Number.isFinite(n) ? n : 0; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { sheet_url, count_name, count_date, warehouse_id, warehouse_name, targetEmail } = payload || {};
    if (!sheet_url) return Response.json({ error: 'sheet_url is required' }, { status: 400 });

    const workingEmail = targetEmail || user.acting_as_store_email || user.email;

    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const sheetId = extractSheetId(sheet_url);
    const meta = await sheetsRequest(sheetsToken, `/v4/spreadsheets/${sheetId}`, {});
    const firstTitle = meta?.sheets?.[0]?.properties?.title || 'Sheet1';
    const valuesRes = await sheetsRequest(sheetsToken, `/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(firstTitle)}!A1:Z10000`, {});
    const rows = valuesRes?.values || [];
    if (rows.length < 2) return Response.json({ error: 'Sheet has no data' }, { status: 400 });

    const headers = rows[0].map(h => String(h||'').trim().toLowerCase());
    const idx = (name) => headers.indexOf(name);
    const iSupplier = idx('supplier_name');
    const iName = idx('item_name');
    const iUnit = idx('unit');
    const iCatalog = idx('catalog_number');
    const iPrice = idx('price_per_unit');
    const iQty = idx('counted_qty');
    const iNotes = idx('notes');

    const allItems = await base44.entities.Item.filter({ created_by: workingEmail }, 'name');

    const items = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const itemName = iName >= 0 ? row[iName] : undefined;
      if (!itemName) continue;
      const catalog = iCatalog >= 0 ? row[iCatalog] : '';
      const unit = iUnit >= 0 ? row[iUnit] : '';
      const price = iPrice >= 0 ? toNumber(row[iPrice]) : 0;
      const qty = iQty >= 0 ? toNumber(row[iQty]) : 0;
      const notes = iNotes >= 0 ? (row[iNotes] || '') : '';

      let matched = null;
      if (catalog) {
        matched = allItems.find(i => (i.catalog_number || '').toString().trim() === catalog.toString().trim());
      }
      if (!matched) {
        matched = allItems.find(i => (i.name || '').toString().trim().toLowerCase() === itemName.toString().trim().toLowerCase());
      }

      items.push({
        item_id: matched?.id || '',
        item_name: matched?.name || String(itemName),
        counted_quantity: qty,
        unit: unit || matched?.unit || '',
        price_per_unit: price || matched?.price || 0,
        total_cost: (price || matched?.price || 0) * qty,
        notes
      });
    }

    const total_inventory_value = items.reduce((s, it) => s + (it.total_cost || 0), 0);

    const countObj = {
      warehouse_id: warehouse_id || '',
      warehouse_name: warehouse_name || 'All Items',
      count_date: count_date || new Date().toISOString().slice(0,10),
      count_type: 'monthly',
      items,
      total_inventory_value,
      name: count_name || `Imported Count ${new Date().toISOString().slice(0,10)}`,
      notes: `Imported from Google Sheet ${sheetId}`,
      status: 'in_progress'
    };

    const created = await base44.entities.InventoryCount.create(countObj);
    return Response.json({ success: true, count: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});