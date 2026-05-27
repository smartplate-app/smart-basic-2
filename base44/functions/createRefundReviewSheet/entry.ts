import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const header = Array.isArray(body?.header) ? body.header : [];
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const title = String(body?.title || `Refund_Review_Report_${new Date().toISOString().slice(0,10)}`);

    if (!rows.length) return Response.json({ error: 'No rows to export' }, { status: 400 });

    // Google Sheets access via connector (already authorized)
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // 1) Create spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sheetsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [{ properties: { title: 'Refund_Review' } }]
      })
    });
    if (!createRes.ok) {
      const details = await createRes.text();
      return Response.json({ error: 'Google API error (create)', details }, { status: 500 });
    }
    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;

    // 2) Write header + rows
    const data = [];
    if (header.length) data.push({ range: 'Refund_Review!A1', values: [header] });
    data.push({ range: `Refund_Review!A${header.length ? 2 : 1}`, values: rows });

    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sheetsToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ valueInputOption: 'RAW', data })
    });
    if (!valuesRes.ok) {
      const details = await valuesRes.text();
      return Response.json({ error: 'Google API error (values)', details, spreadsheetId }, { status: 500 });
    }

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return Response.json({ success: true, spreadsheetId, url, count: rows.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});