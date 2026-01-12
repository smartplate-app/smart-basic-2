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

    rows.push(['', '', '', '', '', '']);
    rows.push(['TOTALS', '', totalBegin, totalPurch, totalEnd, totalUsage]);

    // Fallback CSV builder (in case Google APIs fail)
    const buildUsageRows = () => {
      const uRows = [['Item', 'Unit', 'Usage Qty']];
      Array.from(keys).forEach((key) => {
        const name = beginMap.get(key)?.name || purchasesMap.get(key)?.name || endMap.get(key)?.name || key;
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


    // Create Google Sheet and write data (robust with Drive fallback + shareable link)
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    if (!sheetsToken) {
      return await returnFallbackCSV('Google Sheets is not connected. Returning CSV instead.');
    }
    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive').catch(() => null);
    const title = `AFC ${startDate} to ${endDate}`;

    let spreadsheetId = null;

    // Try create via Sheets API first
    const sheetsCreate = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sheetsToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: { title }, sheets: [{ properties: { title: 'AFC' } }] }),
    });

    if (sheetsCreate.ok) {
      const created = await sheetsCreate.json();
      spreadsheetId = created.spreadsheetId || created?.spreadsheet?.spreadsheetId || null;
    } else if (driveToken) {
      // Fallback: create empty Google Sheet via Drive API
      const driveCreate = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${driveToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: title, mimeType: 'application/vnd.google-apps.spreadsheet' }),
      });
      if (driveCreate.ok) {
        const created = await driveCreate.json();
        spreadsheetId = created.id || null;
      } else {
        const txt = await sheetsCreate.text();
        const txt2 = await driveCreate.text().catch(() => '');
        return await returnFallbackCSV(`Failed to create spreadsheet. Details: ${(txt || '') + (txt2 ? `\n${txt2}` : '')}`);
      }
    } else {
      const txt = await sheetsCreate.text();
      return await returnFallbackCSV(`Failed to create spreadsheet. Details: ${txt}`);
    }

    // Ensure sheets exist: AFC, Usage, Summary
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`, {
      headers: { 'Authorization': `Bearer ${sheetsToken}` },
    });
    const metaJson = await metaRes.json();
    const existingTitles = new Set((metaJson?.sheets || []).map(s => s.properties?.title));
    const needed = ['AFC', 'Usage', 'Summary'].filter(t => !existingTitles.has(t));
    if (needed.length) {
      const requests = needed.map(title => ({ addSheet: { properties: { title } } }));
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      });
    }

    // Refresh metadata to get sheetIds
    const metaRes2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`, {
      headers: { 'Authorization': `Bearer ${sheetsToken}` },
    });
    const meta2 = await metaRes2.json();
    const sheetIdByTitle = {};
    (meta2?.sheets || []).forEach(s => { sheetIdByTitle[s.properties.title] = s.properties.sheetId; });

    // Build additional sheets data
    const usageRows = [['Item', 'Unit', 'Usage Qty']];
    Array.from(keys).forEach((key) => {
      const name = beginMap.get(key)?.name || purchasesMap.get(key)?.name || endMap.get(key)?.name || key;
      const unit = beginMap.get(key)?.unit || purchasesMap.get(key)?.unit || endMap.get(key)?.unit || '';
      const b = Number(beginMap.get(key)?.qty || 0);
      const p = Number(purchasesMap.get(key)?.qty || 0);
      const e = Number(endMap.get(key)?.qty || 0);
      const u = b + p - e;
      usageRows.push([name, unit, u]);
    });
    // sort usage descending (skip header)
    const headerUsage = usageRows.shift();
    usageRows.sort((a,b) => Number(b[2]) - Number(a[2]));
    usageRows.unshift(headerUsage);

    const summaryRows = [
      ['Metric', 'Value'],
      ['Beginning Qty', totalBegin],
      ['Purchases Qty', totalPurch],
      ['Ending Qty', totalEnd],
      ['Usage Qty', totalUsage],
    ];

    // Write all values
    const writeAfc = fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('AFC!A1')}:update?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'AFC!A1', majorDimension: 'ROWS', values: rows })
    });
    const writeUsage = fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Usage!A1')}:update?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'Usage!A1', majorDimension: 'ROWS', values: usageRows })
    });
    const writeSummary = fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Summary!A1')}:update?valueInputOption=RAW`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'Summary!A1', majorDimension: 'ROWS', values: summaryRows })
    });

    const [wr1, wr2, wr3] = await Promise.all([writeAfc, writeUsage, writeSummary]);
    if (!wr1.ok || !wr2.ok || !wr3.ok) {
      const t1 = !wr1.ok ? await wr1.text() : '';
      const t2 = !wr2.ok ? await wr2.text() : '';
      const t3 = !wr3.ok ? await wr3.text() : '';
      return Response.json({ error: 'Failed to write data to sheet', details: `${t1}\n${t2}\n${t3}`.trim() }, { status: 500 });
    }

    // Formatting: freeze header, bold header, auto-resize columns
    const fmtRequests = ['AFC','Usage'].map(title => ({
      updateSheetProperties: {
        properties: { sheetId: sheetIdByTitle[title], gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount'
      }
    })).concat([
      // Bold header rows
      ...['AFC','Usage','Summary'].map(title => ({
        repeatCell: {
          range: { sheetId: sheetIdByTitle[title], startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold'
        }
      })),
      // Auto-resize first 6 columns for AFC, 3 for Usage, 2 for Summary
      { autoResizeDimensions: { dimensions: { sheetId: sheetIdByTitle['AFC'], dimension: 'COLUMNS', startIndex: 0, endIndex: 6 } } },
      { autoResizeDimensions: { dimensions: { sheetId: sheetIdByTitle['Usage'], dimension: 'COLUMNS', startIndex: 0, endIndex: 3 } } },
      { autoResizeDimensions: { dimensions: { sheetId: sheetIdByTitle['Summary'], dimension: 'COLUMNS', startIndex: 0, endIndex: 2 } } },
    ]);

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: fmtRequests })
    });

    // Make link shareable (if Drive token available)
    if (driveToken) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${driveToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false }),
      }).catch(() => {});
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
        items: rows.length - 2,
      },
    });
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