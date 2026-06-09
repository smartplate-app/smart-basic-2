import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title: rawTitle, items, total_value, language } = body;

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Items array is required' }, { status: 400 });
    }

    const title = rawTitle || 'Inventory Count';

    // Group items by warehouse_name
    const warehouses = {};
    for (const item of items) {
      const whName = item.warehouse_name || 'Other';
      if (!warehouses[whName]) warehouses[whName] = [];
      warehouses[whName].push(item);
    }
    
    const summaryItemsMap = {};
    for (const item of items) {
       if (!summaryItemsMap[item.item_id]) {
          summaryItemsMap[item.item_id] = { ...item, counted_quantity: Number(item.counted_quantity) || 0, total_cost: Number(item.total_cost) || 0 };
       } else {
          summaryItemsMap[item.item_id].counted_quantity += Number(item.counted_quantity) || 0;
          summaryItemsMap[item.item_id].total_cost += Number(item.total_cost) || 0;
          if (item.notes) {
             summaryItemsMap[item.item_id].notes = summaryItemsMap[item.item_id].notes ? `${summaryItemsMap[item.item_id].notes}, ${item.notes}` : item.notes;
          }
       }
    }
    const summaryItems = Object.values(summaryItemsMap);
    
    const sheetData = [];
    if (Object.keys(warehouses).length > 1) {
       sheetData.push({ title: 'Summary', items: summaryItems, total: total_value });
    }
    for (const [whName, whItems] of Object.entries(warehouses)) {
       const whTotal = whItems.reduce((acc, i) => acc + (Number(i.total_cost) || 0), 0);
       sheetData.push({ title: whName.substring(0, 100), items: whItems, total: whTotal });
    }

    // OAuth token for Google Sheets
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    const isHebrew = language === 'he';
    const sheetsRequests = sheetData.map((s, i) => ({
       properties: { title: s.title, sheetId: 100 + i, rightToLeft: isHebrew }
    }));

    // Create spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title },
        sheets: sheetsRequests
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return Response.json({ error: 'Failed to create spreadsheet', details: errText }, { status: 500 });
    }

    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;

    const valuesData = [];
    const formattingRequests = [];

    for (let i = 0; i < sheetData.length; i++) {
        const s = sheetData[i];
        const sheetTitle = s.title;
        const sheetId = 100 + i;
        
        const dataRows = s.items.map(item => {
           let cases = '';
           let units = item.counted_quantity !== undefined ? item.counted_quantity : '';
           
           if (item.unit === 'case') {
               // When item unit is 'case', counted_quantity is the total cases
               // To split it we would need units_per_package, which we don't have here.
               // Let's just output the total in Cases column and leave Units blank.
               if (units !== '') {
                   cases = Math.floor(Number(units));
                   let fraction = Number(units) - cases;
                   units = fraction > 0 ? fraction.toFixed(2) : '';
               } else {
                   cases = '';
                   units = '';
               }
           }
           
           return [
              item.item_name || '',
              cases,
              units,
              item.unit || '',
              item.price_per_unit !== undefined ? item.price_per_unit : '',
              item.total_cost !== undefined ? item.total_cost : '',
              item.notes || ''
           ];
        });
        
        const values = [];
        const isHebrew = language === 'he';
        const summarySuffix = isHebrew ? ' (סיכום)' : ' (Summary)';
        const titleRow = title + (s.title === 'Summary' ? summarySuffix : ` - ${s.title}`);
        
        values.push([titleRow, '', '', '', '', '', '']); // Title row
        
        const headers = isHebrew 
           ? ['שם פריט', 'ארגזים שנספרו', 'יחידות שנספרו', 'יחידה', 'מחיר ליחידה', 'עלות כוללת', 'הערות']
           : ['Item Name', 'Counted Cases', 'Counted Units', 'Unit', 'Price per Unit', 'Total Cost', 'Notes'];
        values.push(headers); // Headers
        
        for (const row of dataRows) values.push(row);
        
        const totalLabel = isHebrew ? 'סה"כ' : 'Total';
        values.push(['', '', '', '', totalLabel, s.total || 0, '']); // Total row
        
        valuesData.push({
           range: `'${sheetTitle}'!A1:G${values.length}`,
           values
        });
        
        const rowsCount = values.length;
        const totalRowIndex = rowsCount - 1; // 0-based
        
        formattingRequests.push(
            {
            mergeCells: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
              mergeType: 'MERGE_ALL'
            }
            },
            {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  backgroundColor: { red: 0.85, green: 0.92, blue: 0.98 },
                  textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 0.1, green: 0.2, blue: 0.3 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
            },
            {
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 7 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
            },
            {
            updateSheetProperties: {
              properties: {
                sheetId: sheetId,
                gridProperties: {
                  frozenRowCount: 2
                }
              },
              fields: 'gridProperties.frozenRowCount'
            }
            },
            {
            repeatCell: {
              range: { sheetId, startRowIndex: 2, endRowIndex: totalRowIndex + 1, startColumnIndex: 4, endColumnIndex: 6 },
              cell: {
                userEnteredFormat: {
                  numberFormat: { type: 'NUMBER', pattern: '#,##0.00' }
                }
              },
              fields: 'userEnteredFormat.numberFormat'
            }
            },
            {
            repeatCell: {
              range: { sheetId, startRowIndex: totalRowIndex, endRowIndex: totalRowIndex + 1, startColumnIndex: 0, endColumnIndex: 7 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.96, green: 0.96, blue: 0.86 }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
            },
            {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 7 }
            }
            }
        );
    }

    // Write values
    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valuesData
      })
    });

    if (!valuesRes.ok) {
      return Response.json({ error: 'Failed to write values' }, { status: 500 });
    }

    const fmtRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: formattingRequests })
    });

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    return Response.json({ success: true, spreadsheetId, spreadsheetUrl });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});