import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseSpreadsheetId(input) {
  if (!input) return null;
  const m = String(input).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (input.length > 30 ? input : null);
}

function normStr(v) { return (v ?? '').toString().trim(); }

function normType(v) {
  const s = normStr(v).toLowerCase();
  if (['catalogic', 'קטלוג', 'קטלוגי', 'excel'].some(x => s.includes(x))) return 'catalogic';
  return 'simple';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { spreadsheetUrl, spreadsheetId: rawId, sheetName } = await req.json();
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl) || rawId;
    if (!spreadsheetId) return Response.json({ error: 'Missing spreadsheetId/url' }, { status: 400 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    const range = sheetName ? `${sheetName}!A1:Z1000` : 'Sheet1!A1:Z1000';

    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!getRes.ok) {
      const txt = await getRes.text();
      return Response.json({ error: 'Failed to read sheet', details: txt }, { status: 500 });
    }
    const data = await getRes.json();
    const rows = data.values || [];
    if (rows.length < 2) return Response.json({ error: 'Sheet has no data' }, { status: 400 });

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const bodyRows = rows.slice(1).filter(r => r.some(c => String(c || '').trim() !== ''));

    const col = (names) => {
      for (const n of names) {
        const idx = headers.findIndex(h => h === n.toLowerCase());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxName = col(['שם ספק', 'שם', 'supplier', 'name']);
    if (idxName === -1) return Response.json({ error: 'Missing "שם ספק" column' }, { status: 400 });

    const idxEmail = col(['אימייל', 'email']);
    const idxPhone = col(['טלפון', 'phone']);
    const idxContact = col(['איש קשר', 'contact', 'contact person']);
    const idxType = col(['סוג ספק (simple/catalogic)', 'סוג ספק', 'type']);
    const idxAcc = col(['מספר ספק בחשבונאות', 'accounting', 'accounting code']);
    const idxNotes = col(['הערות', 'notes']);

    const payload = bodyRows.map(r => ({
      name: normStr(r[idxName]),
      email: idxEmail !== -1 ? normStr(r[idxEmail]) : undefined,
      phone: idxPhone !== -1 ? normStr(r[idxPhone]) : undefined,
      contact_person: idxContact !== -1 ? normStr(r[idxContact]) : undefined,
      supplier_type: idxType !== -1 ? normType(r[idxType]) : 'simple',
      accounting_code: idxAcc !== -1 ? normStr(r[idxAcc]) : undefined,
      grant_notes: idxNotes !== -1 ? normStr(r[idxNotes]) : undefined,
    })).filter(x => x.name);

    if (payload.length === 0) return Response.json({ error: 'No valid supplier rows' }, { status: 400 });

    // Create suppliers (user scope)
    const created = await base44.entities.Supplier.bulkCreate(payload);

    return Response.json({ success: true, created_count: created.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});