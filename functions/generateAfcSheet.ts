import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatDateYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const startDate = body.startDate;
    const endDate = body.endDate;

    if (!startDate || !endDate) {
      return Response.json({ error: 'startDate and endDate are required (YYYY-MM-DD)' }, { status: 400 });
    }

    const effectiveEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Load inventory counts and orders for this user
    const [allCounts, allOrders] = await Promise.all([
      base44.entities.InventoryCount.filter({ created_by: effectiveEmail }),
      base44.entities.Order.filter({ created_by: effectiveEmail }),
    ]);

    // Sort counts by date ascending
    const countsSorted = (allCounts || []).slice().sort((a, b) => {
      const ad = new Date(a.count_date || a.created_date || 0).getTime();
      const bd = new Date(b.count_date || b.created_date || 0).getTime();
      return ad - bd;
    });

    // Find beginning (latest count <= start) and ending (latest count <= end)
    let beginning = null;
    let ending = null;
    for (const c of countsSorted) {
      const cd = new Date(c.count_date || c.created_date || 0);
      if (cd <= start) beginning = c;
      if (cd <= end) ending = c;
    }

    const toCountMap = (countRec) => {
      const map = new Map();
      const items = Array.isArray(countRec?.items) ? countRec.items : [];
      items.forEach((it) => {
        const key = it.item_id || it.item_name || it.item || '—';
        const name = it.item_name || key;
        const qty = Number(it.counted_quantity) || 0;
        const unit = it.unit || '';
        const prev = map.get(key) || { name, qty: 0, unit };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        map.set(key, prev);
      });
      return map;
    };

    const beginMap = toCountMap(beginning);
    const endMap = toCountMap(ending);

    // Orders in range (purchases)
    const ordersInRange = (allOrders || []).filter((o) => {
      const d = new Date(o.created_date || o.delivery_date || o.updated_date || 0);
      return d >= start && d <= end;
    });
    const purchasesMap = new Map();
    ordersInRange.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((it) => {
        const key = it.item_id || it.item_name || it.item || '—';
        const name = it.item_name || key;
        const qty = Number(it.quantity) || 0;
        const unit = it.unit || '';
        const prev = purchasesMap.get(key) || { name, qty: 0, unit };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        purchasesMap.set(key, prev);
      });
    });

    // Union of all item keys
    const keys = new Set([
      ...Array.from(beginMap.keys()),
      ...Array.from(endMap.keys()),
      ...Array.from(purchasesMap.keys()),
    ]);

    // Build rows
    const header = ['Item', 'Unit', 'Beginning Qty', 'Purchases Qty', 'Ending Qty', 'Usage Qty'];
    const rows = [header];
    let totalBegin = 0, totalPurch = 0, totalEnd = 0, totalUsage = 0;

    Array.from(keys).sort((a, b) => {
      const an = (beginMap.get(a)?.name || purchasesMap.get(a)?.name || endMap.get(a)?.name || '').toLowerCase();
      const bn = (beginMap.get(b)?.name || purchasesMap.get(b)?.name || endMap.get(b)?.name || '').toLowerCase();
      return an.localeCompare(bn);
    }).forEach((key) => {
      const name = beginMap.get(key)?.name || purchasesMap.get(key)?.name || endMap.get(key)?.name || key;
      const unit = beginMap.get(key)?.unit || purchasesMap.get(key)?.unit || endMap.get(key)?.unit || '';
      const b = Number(beginMap.get(key)?.qty || 0);
      const p = Number(purchasesMap.get(key)?.qty || 0);
      const e = Number(endMap.get(key)?.qty || 0);
      const u = b + p - e;
      totalBegin += b; totalPurch += p; totalEnd += e; totalUsage += u;
      rows.push([name, unit, b, p, e, u]);
    });

    rows.push([]);
    rows.push(['TOTALS', '', totalBegin, totalPurch, totalEnd, totalUsage]);

    // Create Google Sheet and write data
    const token = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    if (!token) {
      return Response.json({ error: 'No Google Sheets access token. Please reconnect Google Sheets.' }, { status: 500 });
    }
    const title = `AFC ${startDate} to ${endDate}`;

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [{ properties: { title: 'AFC' } }],
      }),
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      return Response.json({ error: 'Failed to create spreadsheet', details: txt }, { status: 500 });
    }

    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId || created?.spreadsheet?.spreadsheetId;
    const sheetName = 'AFC';

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!A1')}:update?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${sheetName}!A1`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    });

    if (!updateRes.ok) {
      const txt = await updateRes.text();
      return Response.json({ error: 'Failed to write data to sheet', details: txt }, { status: 500 });
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      meta: {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        beginningCountId: beginning?.id || null,
        endingCountId: ending?.id || null,
        ordersCount: ordersInRange.length,
        items: rows.length - 2, // minus header and totals row
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});