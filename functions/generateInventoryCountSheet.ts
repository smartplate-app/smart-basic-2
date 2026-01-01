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
    body: { role: 'writer', type: 'user', emailAddress: email }
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetEmail, sheet_name } = await req.json().catch(() => ({}));
    const workingEmail = targetEmail || user.acting_as_store_email || user.email;

    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const items = await base44.entities.Item.filter({ created_by: workingEmail }, 'name');

    const headers = [
      'supplier_name',
      'item_name',
      'unit',
      'catalog_number',
      'price_per_unit',
      'counted_qty',
      'notes'
    ];

    const rows = (items || [])
      .sort((a,b) => (a.supplier_name||'').localeCompare(b.supplier_name||'') || (a.name||'').localeCompare(b.name||''))
      .map(it => [
        it.supplier_name || '',
        it.name || '',
        it.unit || '',
        it.catalog_number || '',
        Number(it.price || 0),
        '',
        ''
      ]);

    const root = await findOrCreateFolder(driveToken, 'SmartPlateUploads', null);
    const userFolder = await findOrCreateFolder(driveToken, workingEmail, root.id);
    const monthLabel = new Date().toISOString().slice(0,7);
    const parent = await findOrCreateFolder(driveToken, `Counts-${monthLabel}`, userFolder.id);

    const fileMeta = await driveRequest(driveToken, '/drive/v3/files', {
      method: 'POST',
      query: { fields: 'id,name,webViewLink' },
      body: { name: sheet_name || `InventoryCount-${monthLabel}` , mimeType: 'application/vnd.google-apps.spreadsheet', parents: [parent.id] }
    });

    await sheetsRequest(sheetsToken, `/v4/spreadsheets/${fileMeta.id}/values:batchUpdate`, {
      method: 'POST',
      body: {
        valueInputOption: 'RAW',
        data: [{ range: 'Sheet1!A1', values: [headers, ...rows] }]
      }
    });

    const shareTo = (user.drive_share_email || workingEmail).trim();
    if (shareTo) { await ensureShared(driveToken, fileMeta.id, shareTo); }

    return Response.json({ success: true, sheet: fileMeta, parentFolder: parent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});