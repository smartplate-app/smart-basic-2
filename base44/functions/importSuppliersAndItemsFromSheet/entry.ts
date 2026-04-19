import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    const { spreadsheetUrl } = await req.json();
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) return Response.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });

    // Get access token for the backend API calls
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    console.log("Got access token, spreadsheetId:", spreadsheetId);

    // If fetching sheet names fails, fallback to Sheet1 instead of erroring out right away
    let sheetName = "Sheet1";
    try {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        sheetName = metaData.sheets[0].properties.title;
      }
    } catch (e) {
      console.warn("Could not fetch sheet metadata, falling back to default sheet name", e);
    }
    
    // We try to read data. If it fails, the sheet is truly inaccessible.
    const range = `'${sheetName}'!A1:Z5000`;
    let getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!getRes.ok && sheetName !== "Sheet1") {
       // if we failed, try the generic one too just in case
       getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Sheet1!A1:Z5000')}`, {
         headers: { 'Authorization': `Bearer ${accessToken}` }
       });
    }

    if (!getRes.ok && sheetName !== "גיליון1") {
       getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('גיליון1!A1:Z5000')}`, {
         headers: { 'Authorization': `Bearer ${accessToken}` }
       });
    }
    
    if (!getRes.ok) {
      const errorText = await getRes.text();
      console.error("GetRes error:", errorText);
      return Response.json({ error: 'Failed to read sheet data. Google reports this file does not exist or is fully restricted. If using a work/school account, "Anyone with the link" might only mean your organization. Please verify the link works in an Incognito window.' }, { status: 400 });
    }

    const data = await getRes.json();
    const rows = data.values || [];
    if (rows.length === 0) return Response.json({ error: 'Sheet has no data' }, { status: 400 });

    const allNonEmptyRows = rows.filter(r => r.some(c => String(c || '').trim() !== ''));
    if (allNonEmptyRows.length === 0) return Response.json({ error: 'Sheet has no data' }, { status: 400 });

    const sampleRows = allNonEmptyRows.slice(0, 15);

    // Use LLM to map column indices and find data start
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the following sample rows from a Google Sheet intended for importing restaurant suppliers and items.
Sample rows (JSON format):
${JSON.stringify(sampleRows)}

Your task is to figure out:
1. Which row index (0-based relative to these sample rows) contains the column headers? If there are no headers and it's just data, set header_row_idx to -1.
2. What is the row index where the actual data starts? (data_start_row_idx, 0-based relative to these sample rows)
3. What are the column indices (0-based) for the required data fields?
- supplier_col_idx: Column for Supplier Name (e.g. 'ספק', 'Supplier'). Sometimes a supplier is only specified in the first row of a group.
- item_name_col_idx: Column for Item Name (e.g. 'שם פריט', 'Item')
- price_col_idx: Column for Price (e.g. 'מחיר', 'Price')

Optional fields:
- unit_col_idx: Column for Unit (e.g. 'יחידת מידה', 'Unit', 'קג', 'יח')
- catalog_number_col_idx: Column for Catalog Number (e.g. 'מק"ט', 'SKU')
- discount_col_idx: Column for Discount (e.g. 'הנחה', 'Discount')
- units_per_package_col_idx: Column for Units Per Package (e.g. 'כמות באריזה')

If an optional field is missing, return -1. 
If the data is completely unstructured or missing supplier/item name, return supplier_col_idx: -1.
Return a JSON object matching the schema exactly.`,
      response_json_schema: {
        type: 'object',
        properties: {
          header_row_idx: { type: 'integer' },
          data_start_row_idx: { type: 'integer' },
          supplier_col_idx: { type: 'integer' },
          item_name_col_idx: { type: 'integer' },
          price_col_idx: { type: 'integer' },
          unit_col_idx: { type: 'integer' },
          catalog_number_col_idx: { type: 'integer' },
          discount_col_idx: { type: 'integer' },
          units_per_package_col_idx: { type: 'integer' }
        },
        required: ['header_row_idx', 'data_start_row_idx', 'supplier_col_idx', 'item_name_col_idx', 'price_col_idx']
      }
    });

    if (response.supplier_col_idx === -1 || response.item_name_col_idx === -1) {
      return Response.json({ error: 'Could not find required columns (Supplier and Item Name) in the sheet' }, { status: 400 });
    }

    let startIndex = response.data_start_row_idx;
    if (startIndex === undefined || startIndex === null) {
      startIndex = response.header_row_idx !== -1 ? response.header_row_idx + 1 : 0;
    }
    startIndex = Math.max(0, startIndex);
    
    const bodyRows = allNonEmptyRows.slice(startIndex);

    const targetEmail = user.acting_as_store_email || user.store_user_owner_email || user.acting_as_user_email || user.email;
    const existingSuppliers = await base44.entities.Supplier.filter({ created_by: targetEmail }, null, 5000);
    const supplierMap = new Map(existingSuppliers.map(s => [s.name.trim().toLowerCase(), s]));

    const [itemsByCreator, itemsByStoreOwner] = await Promise.all([
      base44.entities.Item.filter({ created_by: targetEmail }, null, 10000),
      base44.entities.Item.filter({ store_owner_email: targetEmail }, null, 10000)
    ]);
    const allExistingItems = [...itemsByCreator, ...itemsByStoreOwner];
    const existingItemsSet = new Set(allExistingItems.map(i => `${(i.supplier_name || '').trim().toLowerCase()}|${(i.name || '').trim().toLowerCase()}`));

    const itemsToCreate = [];
    const newSuppliersToCreate = new Set();
    
    // First pass: extract all distinct supplier names
    const parsedRows = [];
    let lastSeenSupplier = null;

    for (const r of bodyRows) {
      let sName = (r[response.supplier_col_idx] || '').toString().trim();
      if (!sName && lastSeenSupplier) {
        // Assume grouping
        sName = lastSeenSupplier;
      }
      
      if (!sName) continue;
      lastSeenSupplier = sName;
      
      const itemName = (r[response.item_name_col_idx] || '').toString().trim();
      if (!itemName) continue;

      if (!supplierMap.has(sName.toLowerCase())) {
        newSuppliersToCreate.add(sName);
      }

      parsedRows.push({
        sName,
        item_name: itemName,
        unit: response.unit_col_idx !== -1 ? r[response.unit_col_idx] : 'unit',
        catalog_number: response.catalog_number_col_idx !== -1 ? r[response.catalog_number_col_idx] : undefined,
        price: response.price_col_idx !== -1 ? r[response.price_col_idx] : 0,
        discount: response.discount_col_idx !== -1 ? r[response.discount_col_idx] : 0,
        units_per_package: response.units_per_package_col_idx !== -1 ? r[response.units_per_package_col_idx] : 1
      });
    }

    // Create missing suppliers
    for (const sName of newSuppliersToCreate) {
      const newSup = await base44.asServiceRole.entities.Supplier.create({
        name: sName,
        supplier_type: 'simple',
        created_by: targetEmail,
        store_owner_email: (user.acting_as_store_email || user.store_user_owner_email || user.acting_as_user_email) ? targetEmail : undefined
      });
      supplierMap.set(sName.toLowerCase(), newSup);
    }

    // Build items payload
    for (const row of parsedRows) {
      const supplier = supplierMap.get(row.sName.toLowerCase());
      if (!supplier) continue;

      const itemKey = `${supplier.name.trim().toLowerCase()}|${row.item_name.trim().toLowerCase()}`;
      if (existingItemsSet.has(itemKey)) continue;
      existingItemsSet.add(itemKey);

      itemsToCreate.push({
        name: row.item_name,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        unit: normalizeUnit(row.unit),
        catalog_number: String(row.catalog_number || '').trim() || undefined,
        price: toNumber(row.price),
        discount: toNumber(row.discount),
        price_after_discount: toNumber(row.price) / (1 + (toNumber(row.discount) / 100)),
        units_per_package: toNumber(row.units_per_package) || 1,
        created_by: targetEmail,
        store_owner_email: (user.acting_as_store_email || user.store_user_owner_email || user.acting_as_user_email) ? targetEmail : undefined
      });
    }

    // Create in chunks of 500
    const createdItemsCount = itemsToCreate.length;
    for (let i = 0; i < itemsToCreate.length; i += 500) {
      const chunk = itemsToCreate.slice(i, i + 500);
      await base44.asServiceRole.entities.Item.bulkCreate(chunk);
    }

    return Response.json({ 
      success: true, 
      suppliers_created: newSuppliersToCreate.size,
      items_created: createdItemsCount 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});