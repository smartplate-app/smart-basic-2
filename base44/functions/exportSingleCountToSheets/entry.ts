import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title: rawTitle, items, total_value } = body;

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Items array is required' }, { status: 400 });
    }

    const title = rawTitle || 'Inventory Count';

    // Data rows
    const dataRows = items.map(item => [
      item.item_name || '',
      item.counted_quantity !== undefined ? item.counted_quantity : '',
      item.unit || '',
      item.price_per_unit !== undefined ? item.price_per_unit : '',
      item.total_cost !== undefined ? item.total_cost : ''
    ]);

    // OAuth token for Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Create spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title }
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return Response.json({ error: 'Failed to create spreadsheet', details: errText }, { status: 500 });
    }

    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;
    const sheet = created.sheets?.[0];
    const sheetId = sheet?.properties?.sheetId;
    const sheetTitle = sheet?.properties?.title || 'Sheet1';

    // Prepare values
    const values = [];
    values.push([title, '', '', '', '']); // Title row
    values.push(['Item Name', 'Quantity', 'Unit', 'Price per Unit', 'Total Cost']); // Headers
    for (const row of dataRows) values.push(row);
    values.push(['', '', '', 'Total', total_value || 0]); // Total row

    const rowsCount = values.length;

    // Write values
    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${sheetTitle}!A1:E${rowsCount}`,
            values
          }
        ]
      })
    });

    if (!valuesRes.ok) {
      return Response.json({ error: 'Failed to write values' }, { status: 500 });
    }

    // Format sheet
    const totalRowIndex = rowsCount - 1; // 0-based

    const batchReq = {
      requests: [
        {
          mergeCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
            mergeType: 'MERGE_ALL'
          }
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
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
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
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
          repeatCell: {
            range: { sheetId, startRowIndex: 2, endRowIndex: totalRowIndex + 1, startColumnIndex: 3, endColumnIndex: 5 },
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
            range: { sheetId, startRowIndex: totalRowIndex, endRowIndex: totalRowIndex + 1, startColumnIndex: 0, endColumnIndex: 5 },
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
            dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 5 }
          }
        }
      ]
    };

    const fmtRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batchReq)
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