import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseSpreadsheetId(input) {
  if (!input) return null;
  const m = String(input).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (input.length > 30 ? input : null);
}

function normalizeUnit(u) {
  if (!u) return 'unit';
  const s = String(u).trim().toLowerCase();
  if (['יח', 'יחידה', 'יח׳', 'pcs', 'piece'].some(k => s.includes(k))) return 'unit';
  if (['ק"ג', 'קג', 'קילו', 'kg'].some(k => s.includes(k))) return 'kg';
  if (['ליטר', 'liter', 'lt'].some(k => s.includes(k))) return 'liter';
  if (['ארגז', 'מארז', 'case', 'box'].some(k => s.includes(k))) return 'case';
  return 'unit';
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  const num = Number(String(v).replace(/[,₪%\s]/g, ''));
  return isNaN(num) ? 0 : num;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { spreadsheetUrl, spreadsheetId: rawId, sheetName, supplierId, supplierName } = await req.json();
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl) || rawId;
    if (!spreadsheetId) return Response.json({ error: 'Missing spreadsheetId/url' }, { status: 400 });
    if (!supplierId) return Response.json({ error: 'Missing supplierId' }, { status: 400 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    let actualSheetName = sheetName;
    if (!actualSheetName) {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.sheets && metaData.sheets.length > 0) {
          actualSheetName = metaData.sheets[0].properties.title;
        }
      }
    }

    const range = actualSheetName ? `'${actualSheetName}'!A1:Z1000` : 'Sheet1!A1:Z1000';
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

    const headers = rows[0].map(h => String(h).trim());
    const bodyRows = rows.slice(1).filter(r => r.some(c => String(c || '').trim() !== ''));

    // Hebrew header map + synonyms
    const keyMap = {
      name: ['שם פריט', 'שם', 'פריט', 'item name'],
      catalog_number: ['מספר קטלוגי', 'מק"ט', 'קטלוג'],
      unit: ['יחידה', 'יח׳', 'סוג יחידה', 'unit'],
      price: ['מחיר', 'מחיר ליחידה', 'מחיר לפריט', 'price'],
      discount: ['הנחה (%)', 'הנחה', '% הנחה', 'הנחה באחוזים', 'discount'],
      units_per_package: ['יחידות בחבילה', 'כמות בחבילה', 'אריזות', 'כמות במארז'],
      minimum_stock: ['מלאי מינימלי', 'מינ׳ מלאי'],
      notes: ['הערות', 'תיאור']
    };

    const findCol = (names) => {
      for (const n of names) {
        const idx = headers.findIndex(h => h.toLowerCase().includes(n.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxName = findCol(keyMap.name);
    const idxUnit = findCol(keyMap.unit);

    let items = [];
    if (idxName !== -1 && idxUnit !== -1) {
      // Direct mapping
      const idxCat = findCol(keyMap.catalog_number);
      const idxPrice = findCol(keyMap.price);
      const idxDisc = findCol(keyMap.discount);
      const idxUpp = findCol(keyMap.units_per_package);
      const idxMin = findCol(keyMap.minimum_stock);

      items = bodyRows.map(r => ({
        name: (r[idxName] || '').toString().trim(),
        unit: normalizeUnit(r[idxUnit]),
        catalog_number: idxCat !== -1 ? String(r[idxCat] || '').trim() : undefined,
        price: idxPrice !== -1 ? toNumber(r[idxPrice]) : 0,
        discount: idxDisc !== -1 ? toNumber(r[idxDisc]) : 0,
        units_per_package: idxUpp !== -1 ? toNumber(r[idxUpp]) : 1,
        minimum_stock: idxMin !== -1 ? toNumber(r[idxMin]) : 0,
      })).filter(it => it.name);
    } else {
      // Fallback to LLM mapping (Hebrew instructions)
      const preview = bodyRows.slice(0, 10);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `קלט: כותרות ונתונים מגוגל שיטס של ספק. החזר JSON של פריטים לשמירה במערכת.
כותרות: ${JSON.stringify(headers)}
דוגמאות: ${JSON.stringify(preview)}
החזר מערך של אובייקטים עם השדות: name (שם פריט), unit (unit: unit/kg/liter/case), catalog_number, price (מספר), discount (מספר), units_per_package (מספר), minimum_stock (מספר). שמור על עברית בשם.
אם חסר unit – נחש לפי הטקסט (למשל 'בקבוק'≈unit, 'ק"ג'≈kg, 'ארגז'≈case).`,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  unit: { type: 'string' },
                  catalog_number: { type: 'string' },
                  price: { type: 'number' },
                  discount: { type: 'number' },
                  units_per_package: { type: 'number' },
                  minimum_stock: { type: 'number' }
                },
                required: ['name', 'unit']
              }
            }
          },
          required: ['items']
        }
      });
      items = (response.items || []).map(it => ({
        name: it.name,
        unit: normalizeUnit(it.unit),
        catalog_number: it.catalog_number || undefined,
        price: toNumber(it.price),
        discount: toNumber(it.discount),
        units_per_package: toNumber(it.units_per_package) || 1,
        minimum_stock: toNumber(it.minimum_stock) || 0,
      }));
    }

    if (items.length === 0) {
      return Response.json({ error: 'No items parsed' }, { status: 400 });
    }

    // Attach supplier fields
    const payload = items.map(it => ({
      ...it,
      supplier_id: supplierId,
      supplier_name: supplierName || '',
      unit: normalizeUnit(it.unit || 'unit'),
    }));

    // Create items (user-scoped)
    const created = await base44.entities.Item.bulkCreate(payload);

    return Response.json({ success: true, created_count: created.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});