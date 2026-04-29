import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function createSpreadsheet(accessToken, title) {
  const res = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Items' } }]
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create spreadsheet failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { id: data.spreadsheetId, firstSheetTitle: 'Items' };
}

async function getFirstSheetTitle(accessToken, spreadsheetId) {
  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch spreadsheet failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const title = data?.sheets?.[0]?.properties?.title || 'Sheet1';
  return title;
}

async function clearRange(accessToken, spreadsheetId, rangeA1) {
  const res = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(rangeA1)}:clear`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clear range failed: ${res.status} ${text}`);
  }
}

async function writeValues(accessToken, spreadsheetId, a1Range, values) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(a1Range)}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: a1Range,
      majorDimension: 'ROWS',
      values
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Write values failed: ${res.status} ${text}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const spreadsheetId = payload?.spreadsheetId || payload?.sheetId || null;

    // Which email to use for data scope (respect admin control context)
    const workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
    const isAdminImpersonating = user.role === 'admin' && (user.acting_as_user_email || user.acting_as_store_email);

    // Load items created by this user (catalog items)
    let items = [];
    const api = isAdminImpersonating ? base44.asServiceRole.entities : base44.entities;
    let records = [];
    try {
      const storeUsers = await api.StoreUser.filter({ owner_email: workingEmail });
      const allowedEmails = [workingEmail, ...storeUsers.map(u => u.user_email)];
      for (const email of allowedEmails) {
        const r = await api.Item.filter({ created_by: email }, 'name', 5000);
        if (r) records = [...records, ...r];
      }
      try {
        const r2 = await api.Item.filter({ store_owner_email: workingEmail }, 'name', 5000);
        if (r2) records = [...records, ...r2];
      } catch(e) {}
    } catch(e) {
      records = await api.Item.filter({ created_by: workingEmail }, 'name', 5000);
    }
    items = Array.from(new Map(records.map(r => [r.id, r])).values());

    const headers = ['name', 'unit', 'price', 'discount'];
    const rows = (items || []).map((it) => [
      it.name || '',
      it.unit || '',
      (typeof it.price === 'number' ? it.price : Number(it.price) || 0),
      (typeof it.discount === 'number' ? it.discount : Number(it.discount) || 0)
    ]);

    const title = `COGS Items - ${user.business_name || workingEmail}`;

    // Get OAuth token from app connector (already authorized)
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    let targetSpreadsheetId = spreadsheetId;
    let sheetTitle = 'Items';

    if (!targetSpreadsheetId) {
      const created = await createSpreadsheet(accessToken, title);
      targetSpreadsheetId = created.id;
      sheetTitle = created.firstSheetTitle || 'Items';
    } else {
      sheetTitle = await getFirstSheetTitle(accessToken, targetSpreadsheetId);
      await clearRange(accessToken, targetSpreadsheetId, `${sheetTitle}!A1:Z`);
    }

    const allValues = [headers, ...rows];
    const endRow = allValues.length;
    const endCol = 'D'; // A..D
    const range = `${sheetTitle}!A1:${endCol}${endRow}`;

    await writeValues(accessToken, targetSpreadsheetId, range, allValues);

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId: targetSpreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    const url = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
    return Response.json({ success: true, url, spreadsheetId: targetSpreadsheetId, rows: rows.length });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});