import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u200f\u200e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    // Use app connectors (already authorized)
    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    const sheetsToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // 1) Find latest spreadsheet created for matching
    const q = "mimeType='application/vnd.google-apps.spreadsheet' and name contains 'Item Name Matching' and trashed = false";
    const listResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${driveToken}` }
    });
    if (!listResp.ok) {
      const txt = await listResp.text();
      throw new Error(`Drive list failed: ${listResp.status} ${txt}`);
    }
    const files = (await listResp.json())?.files || [];
    if (!files.length) {
      return Response.json({ success: false, message: 'No matching spreadsheet found. Create it from Admin Dashboard first.' }, { status: 404 });
    }
    const spreadsheetId = files[0].id;

    // 2) Read Aliases sheet
    const range = 'Aliases!A2:G20000';
    const valuesResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`, {
      headers: { Authorization: `Bearer ${sheetsToken}` }
    });
    if (!valuesResp.ok) {
      const txt = await valuesResp.text();
      throw new Error(`Sheets read failed: ${valuesResp.status} ${txt}`);
    }
    const values = (await valuesResp.json())?.values || [];

    let created = 0, updated = 0, skipped = 0;
    for (const row of values) {
      const alias = (row[0] || '').trim();
      const language = (row[1] || '').trim() || 'other';
      const normalizedRow = (row[2] || '').trim();
      const matchItemId = (row[4] || '').trim();
      const matchItemName = (row[5] || '').trim();
      const notes = (row[6] || '').trim();

      if (!alias) { skipped++; continue; }
      if (!matchItemId && !matchItemName) { skipped++; continue; }

      const normalized = normalizedRow || normalize(alias);

      // Try to enrich name if item id exists
      let finalItemName = matchItemName;
      if (matchItemId && !finalItemName) {
        try {
          const item = await base44.asServiceRole.entities.Item.get(matchItemId);
          finalItemName = item?.name || '';
        } catch {}
      }

      // Upsert by normalized key
      let existing = [];
      try {
        existing = await base44.asServiceRole.entities.ItemAlias.filter({ normalized });
      } catch {}

      if (existing && existing.length > 0) {
        const rec = existing[0];
        await base44.asServiceRole.entities.ItemAlias.update(rec.id, {
          alias,
          normalized,
          item_id: matchItemId || rec.item_id || '',
          item_name: finalItemName || rec.item_name || '',
          language,
          notes
        });
        updated++;
      } else {
        await base44.asServiceRole.entities.ItemAlias.create({
          alias,
          normalized,
          item_id: matchItemId || '',
          item_name: finalItemName || '',
          language,
          notes
        });
        created++;
      }
    }

    return Response.json({ success: true, spreadsheetId, created, updated, skipped, totalRows: values.length });
  } catch (error) {
    return Response.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
});