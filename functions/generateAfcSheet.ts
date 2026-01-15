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
    const startCountId = body.startCountId || body.beginCountId || null;
    const endCountId = body.endCountId || body.finishCountId || null;

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

    // Canonicalize item names and unify keys across counts and receipts
    const canonicalizeName = (s) => {
      const str = String(s || '').toLowerCase();
      // remove text in parentheses and collapse spaces
      return str.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    };

    // Map canonical name -> item_id (when available) so all sources aggregate to the same key
    const nameAlias = new Map();
    const registerAlias = (name, id) => {
      const cn = canonicalizeName(name);
      if (!cn) return;
      if (id) nameAlias.set(cn, id);
    };
    // Pre-scan all items to register aliases
    (allCounts || []).forEach(c => {
      const items = Array.isArray(c.items) ? c.items : [];
      items.forEach(it => registerAlias(it.item_name || it.item, it.item_id));
    });
    (allOrders || []).forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach(it => registerAlias(it.item_name || it.item, it.item_id));
    });

    // Sort counts by date ascending
    const countsSorted = (allCounts || []).slice().sort((a, b) => {
      const ad = new Date(a.count_date || a.created_date || 0).getTime();
      const bd = new Date(b.count_date || b.created_date || 0).getTime();
      return ad - bd;
    });

    // Find beginning and ending counts: use explicit IDs if provided; otherwise derive from dates
    let beginning = null;
    let ending = null;
    if (startCountId || endCountId) {
      beginning = (allCounts || []).find(c => c.id === startCountId) || null;
      ending = (allCounts || []).find(c => c.id === endCountId) || null;
    } else {
      for (const c of countsSorted) {
        const cd = new Date(c.count_date || c.created_date || 0);
        if (cd <= start) beginning = c;
      }
      // Ending: first count on/after end; fallback to latest on/before end
      ending = countsSorted.find(c => {
        const cd = new Date(c.count_date || c.created_date || 0);
        return cd >= end;
      }) || countsSorted.filter(c => new Date(c.count_date || c.created_date || 0) <= end).pop() || null;
      // Ensure distinct counts when possible
      if (beginning && ending && beginning.id === ending.id) {
        const idx = countsSorted.findIndex(c => c.id === beginning.id);
        if (idx >= 0 && idx + 1 < countsSorted.length) {
          ending = countsSorted[idx + 1];
        }
      }
    }

    const toCountMap = (countRec) => {
      const map = new Map();
      const items = Array.isArray(countRec?.items) ? countRec.items : [];
      items.forEach((it) => {
        const rawName = it.item_name || it.item || '—';
        const cn = canonicalizeName(rawName);
        const preferredKey = nameAlias.get(cn);
        const key = preferredKey || it.item_id || cn;
        const name = rawName;
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

    // Orders in range (purchases recorded as orders, like GUI)
    const ordersInRange = (allOrders || []).filter((o) => {
      const d = new Date(o.delivery_date || o.created_date || 0);
      return d >= start && d <= end;
    });
    const ordersMap = new Map();
    ordersInRange.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((it) => {
        const rawName = it.item_name || it.item || '—';
        const cn = canonicalizeName(rawName);
        const preferredKey = nameAlias.get(cn);
        const key = preferredKey || it.item_id || cn;
        const name = rawName;
        const qty = Number(it.quantity || 0) || 0;
        const unit = it.unit || '';
        const prev = ordersMap.get(key) || { name, qty: 0, unit };
        prev.qty += qty;
        if (!prev.unit && unit) prev.unit = unit;
        ordersMap.set(key, prev);
      });
    });

    // Use only items present in both begin and end counts (align with GUI)
    const keys = new Set(Array.from(beginMap.keys()).filter((k) => endMap.has(k)));

    // Build rows
    const header = ['Item', 'Unit', 'Beginning Qty', 'Orders Qty', 'Ending Qty', 'Usage Qty'];
    const rows = [header];
    let totalBegin = 0, totalPurch = 0, totalEnd = 0, totalUsage = 0;

    Array.from(keys).sort((a, b) => {
      const an = (beginMap.get(a)?.name || ordersMap.get(a)?.name || endMap.get(a)?.name || '').toLowerCase();
      const bn = (beginMap.get(b)?.name || ordersMap.get(b)?.name || endMap.get(b)?.name || '').toLowerCase();
      return an.localeCompare(bn);
    }).forEach((key) => {
      const name = beginMap.get(key)?.name || ordersMap.get(key)?.name || endMap.get(key)?.name || key;
      const unit = beginMap.get(key)?.unit || ordersMap.get(key)?.unit || endMap.get(key)?.unit || '';
      const b = Number(beginMap.get(key)?.qty || 0);
      const p = Number(ordersMap.get(key)?.qty || 0);
      const e = Number(endMap.get(key)?.qty || 0);
      const u = Math.max(0, b + p - e);
      totalBegin += b; totalPurch += p; totalEnd += e; totalUsage += u;
      rows.push([name, unit, b, p, e, u]);
    });

    rows.push(['', '', '', '', '', '']);
    rows.push(['TOTALS', '', totalBegin, totalPurch, totalEnd, totalUsage]);

    // Fallback CSV builder (in case Google APIs fail)
    const buildUsageRows = () => {
      const uRows = [['Item', 'Unit', 'Usage Qty']];
      Array.from(keys).forEach((key) => {
        const name = beginMap.get(key)?.name || ordersMap.get(key)?.name || endMap.get(key)?.name || key;
        const unit = beginMap.get(key)?.unit || ordersMap.get(key)?.unit || endMap.get(key)?.unit || '';
        const b = Number(beginMap.get(key)?.qty || 0);
        const p = Number(ordersMap.get(key)?.qty || 0);
        const e = Number(endMap.get(key)?.qty || 0);
        const u = Math.max(0, b + p - e);
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
      ['Orders Qty', totalPurch],
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

    // 2) Build Usage-only single column (match GUI values)
    const usageOnly = [['Usage']];
    Array.from(keys).forEach((key) => {
      const b = Number(beginMap.get(key)?.qty || 0);
      const p = Number(ordersMap.get(key)?.qty || 0);
      const e = Number(endMap.get(key)?.qty || 0);
      const u = Math.max(0, b + p - e);
      usageOnly.push([u]);
    });
    const hdr = usageOnly.shift();
    usageOnly.sort((a,b) => Number(b[0]) - Number(a[0]));
    usageOnly.unshift(hdr);

    // 3) Write values
    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: [{ range: `${sheetTitle}!A1:A${usageOnly.length}`, values: usageOnly }] })
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
        { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } },
        { repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.###' } } }, fields: 'userEnteredFormat.numberFormat' } },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 } } },
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
    return Response.json({ success: true, spreadsheetId, spreadsheetUrl });
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