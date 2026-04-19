import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function driveRequest(accessToken, path, { method = 'GET', query = {}, headers = {}, body } = {}) {
  const url = new URL(`https://www.googleapis.com${path}`);
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)); });
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body && !(body instanceof Uint8Array || typeof body === 'string') ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body && !(body instanceof Uint8Array || typeof body === 'string') ? JSON.stringify(body) : body,
  });
  if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`Drive ${method} ${path} failed (${res.status}): ${txt}`); }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? await res.json() : await res.arrayBuffer();
}

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

async function findOrCreateFolder(accessToken, name, parentId = null) {
  try {
    const qParts = [
      `name = '${name.replace(/'/g, "\\'")}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      'trashed = false',
    ];
    if (parentId) qParts.push(`'${parentId}' in parents`);
    const q = qParts.join(' and ');
    const list = await driveRequest(accessToken, '/drive/v3/files', { query: { q, fields: 'files(id,name,webViewLink,parents)', spaces: 'drive' } });
    if (list?.files?.length) return list.files[0];
  } catch (_) {}
  const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  return await driveRequest(accessToken, '/drive/v3/files', { method: 'POST', query: { fields: 'id,name,webViewLink' }, body: meta });
}

async function ensureShared(accessToken, fileId, email) {
  if (!email) return;
  await driveRequest(accessToken, `/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    query: { sendNotificationEmail: 'false' },
    body: { role: 'reader', type: 'user', emailAddress: email }
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { month, receipts, targetEmail, shareEmail } = await req.json();
    if (!month) return Response.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });

    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const targetUserEmail = (targetEmail || user?.acting_as_store_email || user?.acting_as_user_email || user?.email || 'unknown-user');

    const root = await findOrCreateFolder(driveToken, 'SmartPlateUploads', null);
    const userFolder = await findOrCreateFolder(driveToken, targetUserEmail, root.id);
    const parent = await findOrCreateFolder(driveToken, `Invoices-${month}`, userFolder.id);

    // Build suppliers map (id -> {name, accounting_code})
    let supplierMap = {};
    try {
      const suppliers = await base44.entities.Supplier.filter({ created_by: targetUserEmail });
      suppliers.forEach(s => { supplierMap[s.id] = { name: s.name, accounting_code: s.accounting_code || '' }; });
    } catch {}

    // Prepare sheet
    const sheetFile = await driveRequest(driveToken, '/drive/v3/files', {
      method: 'POST',
      query: { fields: 'id,name,webViewLink' },
      body: { name: `Invoices-${month}-Summary`, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [parent.id] }
    });

    const headers = [
      'supplier_name',
      'supplier_accounting_code',
      'supplier_id',
      'invoice_number',
      'date',
      'amount',
      'image_url',
      'drive_folder_link'
    ];

    const rows = (Array.isArray(receipts) ? receipts : []).map(r => {
      const sup = supplierMap[r.supplier_id] || { name: r.supplier_name || '', accounting_code: '' };
      const dateStr = (r.invoice_date || r.received_date || '').toString().slice(0, 10);
      const amount = Number(r.invoice_total || 0) || 0;
      const img = Array.isArray(r.receipt_images) && r.receipt_images.length ? r.receipt_images[0] : '';
      return [
        sup.name || r.supplier_name || '',
        sup.accounting_code || '',
        r.supplier_id || '',
        r.invoice_number || '',
        dateStr,
        amount,
        img,
        parent.webViewLink || ''
      ];
    });

    await sheetsRequest(sheetsToken, `/v4/spreadsheets/${sheetFile.id}/values:batchUpdate`, {
      method: 'POST',
      body: {
        valueInputOption: 'RAW',
        data: [{ range: 'Sheet1!A1', values: [headers, ...rows] }]
      }
    });

    // Share sheet with accountant/user
    const emailToShare = (shareEmail || user?.drive_share_email || targetUserEmail || '').trim();
    if (emailToShare) {
      await ensureShared(driveToken, sheetFile.id, emailToShare);
    }

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId: sheetFile.id });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    return Response.json({ success: true, sheet: sheetFile, parentFolder: parent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});