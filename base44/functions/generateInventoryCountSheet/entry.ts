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

    const { targetEmail, sheet_name, warehouse_id, language } = await req.json().catch(() => ({}));
    const workingEmail = targetEmail || user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;

    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const isAdminImpersonating = user.role === 'admin' && (targetEmail || user.acting_as_user_email || user.acting_as_store_email);
    
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

    if (warehouse_id) {
      items = items.filter(it => it.warehouse_id === warehouse_id || (it.warehouse_ids && it.warehouse_ids.includes(warehouse_id)));
    }

    // Make sure we include items assigned via the warehouse's catalog_items
    if (warehouse_id) {
      try {
        const whQuery = isAdminImpersonating 
          ? await base44.asServiceRole.entities.Warehouse.filter({ id: warehouse_id })
          : await base44.entities.Warehouse.filter({ id: warehouse_id });
        const wh = whQuery?.[0];
        if (wh && wh.catalog_items) {
          // If the item ID is in the warehouse's catalog_items array, force it to match
          items.forEach(it => {
            if (wh.catalog_items.includes(it.id)) {
              it.warehouse_id = warehouse_id;
              if (!it.warehouse_ids) it.warehouse_ids = [];
              if (!it.warehouse_ids.includes(warehouse_id)) it.warehouse_ids.push(warehouse_id);
              if (!it.warehouse_names) it.warehouse_names = [];
              if (!it.warehouse_names.includes(wh.name)) it.warehouse_names.push(wh.name);
            }
          });
        }
      } catch (e) {
        console.error('Error fetching warehouse for catalog items', e);
      }
    }

    const isHebrew = language === 'he';
    const headers = isHebrew ? [
      'שם ספק',
      'שם פריט',
      'ארגזים שנספרו',
      'יחידות שנספרו',
      'הערות'
    ] : [
      'Supplier',
      'Item Name',
      'Counted Cases',
      'Counted Units',
      'Notes'
    ];

    // Group items by warehouse
    const warehouseMap = new Map();
    const noWarehouseKey = isHebrew ? 'ללא מחסן' : 'No Warehouse';

    (items || []).forEach(it => {
      const warehouses = it.warehouse_names && it.warehouse_names.length > 0
        ? it.warehouse_names
        : (it.warehouse_name ? [it.warehouse_name] : [noWarehouseKey]);

      warehouses.forEach(whName => {
        const key = whName || noWarehouseKey;
        if (!warehouseMap.has(key)) warehouseMap.set(key, []);
        warehouseMap.get(key).push(it);
      });
    });

    // If no warehouse grouping, put everything under one tab
    if (warehouseMap.size === 0) {
      warehouseMap.set(isHebrew ? 'כל הפריטים' : 'All Items', items);
    }

    const warehouseEntries = Array.from(warehouseMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const root = await findOrCreateFolder(driveToken, 'SmartPlateUploads', null);
    const userFolder = await findOrCreateFolder(driveToken, workingEmail, root.id);
    const monthLabel = new Date().toISOString().slice(0,7);
    const parent = await findOrCreateFolder(driveToken, `Counts-${monthLabel}`, userFolder.id);

    const fileMeta = await driveRequest(driveToken, '/drive/v3/files', {
      method: 'POST',
      query: { fields: 'id,name,webViewLink' },
      body: { name: sheet_name || `InventoryCount-${monthLabel}`, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [parent.id] }
    });

    const spreadsheetId = fileMeta.id;

    // Build sheets: rename Sheet1 to first warehouse, add rest
    const firstWhName = warehouseEntries[0][0];
    const safeTabName = (name) => name.replace(/[\\\/\?\*\[\]:]/g, '-').substring(0, 31);

    // Rename the default Sheet1 to first warehouse name
    const renameRequests = [
      {
        updateSheetProperties: {
          properties: { sheetId: 0, title: safeTabName(firstWhName), ...(isHebrew ? { rightToLeft: true } : {}) },
          fields: isHebrew ? 'title,rightToLeft' : 'title'
        }
      }
    ];

    // Add additional sheets for each warehouse (after the first)
    for (let i = 1; i < warehouseEntries.length; i++) {
      renameRequests.push({
        addSheet: {
          properties: {
            title: safeTabName(warehouseEntries[i][0]),
            index: i,
            ...(isHebrew ? { rightToLeft: true } : {})
          }
        }
      });
    }

    const batchResult = await sheetsRequest(sheetsToken, `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: { requests: renameRequests }
    });

    // Get real sheetIds assigned to each tab
    const sheetIdMap = new Map();
    sheetIdMap.set(safeTabName(firstWhName), 0);
    if (batchResult?.replies) {
      batchResult.replies.forEach((reply, idx) => {
        if (reply?.addSheet?.properties) {
          const tabName = safeTabName(warehouseEntries[idx + 1]?.[0] || '');
          sheetIdMap.set(tabName, reply.addSheet.properties.sheetId);
        }
      });
    }

    // Write data to each sheet tab
    const valueData = [];
    for (const [whName, whItems] of warehouseEntries) {
      const tabName = safeTabName(whName);
      const rows = whItems
        .sort((a, b) => (a.supplier_name||'').localeCompare(b.supplier_name||'') || (a.name||'').localeCompare(b.name||''))
        .map(it => {
          const isCaseItem = it.unit === 'case';
          return [
            it.supplier_name || '',
            it.name || '',
            isCaseItem ? '' : 'N/A',
            '',
            ''
          ];
        });
      valueData.push({ range: `${tabName}!A1`, values: [headers, ...rows] });
    }

    await sheetsRequest(sheetsToken, `/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: { valueInputOption: 'RAW', data: valueData }
    });

    // Format each sheet: freeze header, filter, auto-resize
    const formatRequests = [];
    for (const [whName, whItems] of warehouseEntries) {
      const tabName = safeTabName(whName);
      const sheetId = sheetIdMap.get(tabName) ?? 0;
      const rowCount = whItems.length + 1;
      formatRequests.push(
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        { setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: headers.length } } } },
        { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length } } }
      );
    }

    try {
      await sheetsRequest(sheetsToken, `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: { requests: formatRequests }
      });
    } catch (formatError) {
      console.error('Failed to format sheets:', formatError);
    }

    const shareTo = (user.drive_share_email || workingEmail).trim();
    if (shareTo) { await ensureShared(driveToken, fileMeta.id, shareTo); }

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId: fileMeta.id });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    return Response.json({ success: true, sheet: fileMeta, parentFolder: parent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});