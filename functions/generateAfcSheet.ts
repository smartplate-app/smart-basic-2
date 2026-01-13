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

    // Load inventory counts, supply receipts and items for this user
    const [allCounts, allReceipts, allItems] = await Promise.all([
      base44.entities.InventoryCount.filter({ created_by: effectiveEmail }),
      base44.entities.SupplyReceipt.filter({ created_by: effectiveEmail }),
      base44.entities.Item.filter({ created_by: effectiveEmail }),
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

    const normalize = (s) => String(s || '').trim().toLowerCase();

    const toCountMap = (countRec, itemById, itemByName) => {
      const map = new Map();
      const items = Array.isArray(countRec?.items) ? countRec.items : [];
      items.forEach((it) => {
        const byId = it.item_id && itemById.get(it.item_id);
        const byName = !byId ? itemByName.get(normalize(it.item_name || it.item)) : null;
        const itemDef = byId || byName || null;
        const baseUnit = it.unit || itemDef?.unit || '';
        const rawQty = Number(it.counted_quantity) || 0;
        let qty = rawQty;
        // Convert cases to base units when possible
        if (baseUnit === 'case' && itemDef?.units_per_package) {
          qty = rawQty * Number(itemDef.units_per_package);
        }
        const key = (itemDef?.id) || it.item_id || normalize(it.item_name || it.item) || '—';
        const name = it.item_name || itemDef?.name || it.item || key;
        const unit = baseUnit === 'case' && itemDef?.unit ? itemDef.unit : baseUnit;
        const prev = map.get(key) || { name, qty: 0, unit };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        map.set(key, prev);
      });
      return map;
    };

    const itemById = new Map();
    const itemByName = new Map();
    (allItems || []).forEach((it) => {
      itemById.set(it.id, it);
      itemByName.set((it.name || '').trim().toLowerCase(), it);
    });

    const beginMap = toCountMap(beginning, itemById, itemByName);
    const endMap = toCountMap(ending, itemById, itemByName);

    // If beginning and ending refer to the same count, pick previous count for beginning when available
    if (beginning && ending && beginning.id === ending.id) {
      const earlier = countsSorted.filter(c => new Date(c.count_date || c.created_date || 0) < new Date(beginning.count_date || beginning.created_date || 0));
      if (earlier.length > 0) {
        beginning = earlier[earlier.length - 1];
        const tmpBegin = toCountMap(beginning, itemById, itemByName);
        beginMap.clear();
        for (const [k, v] of tmpBegin.entries()) beginMap.set(k, v);
      }
    }

    // Supply Receipts in range (actual purchases received)
    const receiptsInRange = (allReceipts || []).filter((r) => {
      const d = new Date(r.received_date || r.created_date || r.updated_date || 0);
      return d >= start && d <= end;
    });

    // Purchases aggregation from receipts (key by item id or normalized name)
    const purchasesMap = new Map();
    receiptsInRange.forEach((r) => {
      const vitems = Array.isArray(r.verified_items) ? r.verified_items : [];
      vitems.forEach((it) => {
        const itemDef = it.item_id ? itemById.get(it.item_id) : (it.item_name ? itemByName.get(normalize(it.item_name)) : null);
        const baseUnit = it.unit || itemDef?.unit || '';
        const rawQty = Number(it.received_quantity ?? it.certificate_quantity ?? it.ordered_quantity ?? it.quantity ?? 0) || 0;
        let qty = rawQty;
        if (baseUnit === 'case' && itemDef?.units_per_package) {
          qty = rawQty * Number(itemDef.units_per_package);
        }
        const key = (itemDef?.id) || it.item_id || normalize(it.item_name || it.item) || '—';
        const name = it.item_name || itemDef?.name || key;
        const unit = baseUnit === 'case' && itemDef?.unit ? itemDef.unit : baseUnit;
        const prev = purchasesMap.get(key) || { name, qty: 0, unit };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        purchasesMap.set(key, prev);
      });
    });

    // Ensure beginning and ending counts are distinct; if same, pick next earlier for beginning
    if (beginning && ending && (beginning.id === ending.id)) {
      const earlier = countsSorted.filter(c => new Date(c.count_date || c.created_date || 0) < new Date(beginning.count_date || beginning.created_date || 0));
      if (earlier.length > 0) {
        beginning = earlier[earlier.length - 1];
        // Rebuild beginMap with the adjusted beginning
        const tmp = toCountMap(beginning, itemById, itemByName);
        beginMap.clear();
        for (const [k,v] of tmp.entries()) beginMap.set(k, v);
      }
    }

    // Ensure beginning and ending counts are distinct; if same, pick next earlier for beginning
    if (beginning && ending && (beginning.id === ending.id)) {
      const earlier = countsSorted.filter(c => new Date(c.count_date || c.created_date || 0) < new Date(beginning.count_date || beginning.created_date || 0));
      if (earlier.length > 0) {
        beginning = earlier[earlier.length - 1];
        const tmp = toCountMap(beginning, itemById, itemByName);
        beginMap.clear();
        for (const [k,v] of tmp.entries()) beginMap.set(k, v);
      }
    }

    // Union of all item keys
    const keys = new Set([
      ...Array.from(beginMap.keys()),
      ...Array.from(endMap.keys()),
      ...Array.from(purchasesMap.keys()),
    ]);

    // Build rows
    const header = ['Item', 'Unit', 'Beginning Qty', 'Purchases Qty', 'Ending Qty', 'Usage Qty'];
    const rows = [header];
    const displayName = (key) => beginMap.get(key)?.name || purchasesMap.get(key)?.name || endMap.get(key)?.name || key;

    // Helper for consistent name display (prefer Item entity name)
    const displayName = (key) => beginMap.get(key)?.name || purchasesMap.get(key)?.name || endMap.get(key)?.name || key; // prefer consistent names
    let totalBegin = 0, totalPurch = 0, totalEnd = 0, totalUsage = 0;

    Array.from(keys).sort((a, b) => {
      const an = (beginMap.get(a)?.name || purchasesMap.get(a)?.name || endMap.get(a)?.name || '').toLowerCase();
      const bn = (beginMap.get(b)?.name || purchasesMap.get(b)?.name || endMap.get(b)?.name || '').toLowerCase();
      return an.localeCompare(bn);
    }).forEach((key) => {
      const name = displayName(key);
      const unit = beginMap.get(key)?.unit || purchasesMap.get(key)?.unit || endMap.get(key)?.unit || '';
      const b = Number(beginMap.get(key)?.qty || 0);
      const p = Number(purchasesMap.get(key)?.qty || 0);
      const e = Number(endMap.get(key)?.qty || 0);
      const u = b + p - e;
      totalBegin += b; totalPurch += p; totalEnd += e; totalUsage += u;
      rows.push([name, unit, b, p, e, u]);
    });

    rows.push(['', '', '', '', '', '']);
    rows.push(['TOTALS', '', totalBegin, totalPurch, totalEnd, totalUsage]);

    // Fallback CSV builder (in case Google APIs fail)
    const buildUsageRows = () => {
      const uRows = [['Item', 'Unit', 'Usage Qty']];
      Array.from(keys).forEach((key) => {
        const name = displayName(key);
        const unit = beginMap.get(key)?.unit || purchasesMap.get(key)?.unit || endMap.get(key)?.unit || '';
        const b = Number(beginMap.get(key)?.qty || 0);
        const p = Number(purchasesMap.get(key)?.qty || 0);
        const e = Number(endMap.get(key)?.qty || 0);
        const u = b + p - e;
        uRows.push([name, unit, u]);
      });
      const header = uRows.shift();
      uRows.sort((a,b) => Number(b[2]) - Number(a[2]));
      uRows.unshift(header);
      return uRows;
    };

    const buildSummaryRows = () => ([
      ['Metric', 'Value'],
      ['Beginning Qty', totalBegin],
      ['Purchases Qty', totalPurch],
      ['Ending Qty', totalEnd],
      ['Usage Qty', totalUsage],
    ]);

    const escapeCsv = (v) => {
      const s = String(v ?? '');
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const toCsv = (arr) => arr.map(r => r.map(escapeCsv).join(',')).join('\n');

    const returnFallbackCSV = async (message) => {
      const usageRows = buildUsageRows();
      const summaryRows = buildSummaryRows();
      const parts = [
        '# AFC', '', toCsv(rows), '', '# Usage', '', toCsv(usageRows), '', '# Summary', '', toCsv(summaryRows)
      ];
      const csvContent = parts.join('\n');
      return Response.json({
        success: true,
        spreadsheetId: null,
        spreadsheetUrl: null,
        csvContent,
        suggestedFileName: `AFC_${startDate}_to_${endDate}.csv`,
        note: message || null
      });
    };


    // Create Google Sheet (single sheet, 3 columns) — same pattern as other exports
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    if (!accessToken) {
      return await returnFallbackCSV('Google Sheets token missing.');
    }

    const title = `AFC ${formatDateYYYYMMDD(start)} - ${formatDateYYYYMMDD(end)}`;

    // 1) Create spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title } })
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      return await returnFallbackCSV(`Create spreadsheet failed: ${errText}`);
    }
    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;
    const first = created.sheets?.[0]?.properties || {};
    const sheetId = first.sheetId;
    const sheetTitle = first.title || 'Sheet1';

    // 2) Build Usage rows (Item, Unit, Usage)
    const usageOnly = [['Item', 'Unit', 'Usage']];
    Array.from(keys).forEach((key) => {
      const name = displayName(key);
      const unit = beginMap.get(key)?.unit || purchasesMap.get(key)?.unit || endMap.get(key)?.unit || '';
      const b = Number(beginMap.get(key)?.qty || 0);
      const p = Number(purchasesMap.get(key)?.qty || 0);
      const e = Number(endMap.get(key)?.qty || 0);
      const u = b + p - e;
      usageOnly.push([name, unit, u]);
    });
    const hdr = usageOnly.shift();
    usageOnly.sort((a,b) => Number(b[2]) - Number(a[2]));
    usageOnly.unshift(hdr);

    // Prepend a header row with the date range for clarity
    usageOnly.unshift([`Period: ${formatDateYYYYMMDD(start)} to ${formatDateYYYYMMDD(end)}`, '', '']);

    // 3) Write values
    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: [{ range: `${sheetTitle}!A1:C${usageOnly.length}`, values: usageOnly }] })
    });
    if (!valuesRes.ok) {
      const errText = await valuesRes.text();
      return await returnFallbackCSV(`Write values failed: ${errText}`);
    }

    // 4) Format (rename, freeze, bold, number format, auto-resize)
    const fmtReq = {
      requests: [
        { updateSheetProperties: { properties: { sheetId, title: 'AFC' }, fields: 'title' } },
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
        { repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 2, endColumnIndex: 3 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.###' } } }, fields: 'userEnteredFormat.numberFormat' } },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 3 } } },
      ]
    };
    const fmtRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fmtReq)
    });
    if (!fmtRes.ok) {
      const errText = await fmtRes.text();
      return await returnFallbackCSV(`Format failed: ${errText}`);
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    return Response.json({ success: true, spreadsheetId, spreadsheetUrl, debug: { counts: { beginId: beginning?.id || null, endId: ending?.id || null }, range: { start: startDate, end: endDate } } });
  } catch (error) {
    // Last-resort CSV fallback if anything unexpected happens
    try {
      const csvContent = (error && (error.stack || error.message)) ? String(error.stack || error.message) : 'Unknown error';
      return Response.json({ success: false, error: 'Unexpected error', details: csvContent });
    } catch {
      return Response.json({ error: 'Unexpected error' }, { status: 500 });
    }
  }
});