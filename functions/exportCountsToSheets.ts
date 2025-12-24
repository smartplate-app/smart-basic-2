import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const startDate = body?.start_date || null;
    const endDate = body?.end_date || null;
    const customTitle = body?.title || null;

    // Determine working email (owner vs store user)
    let workingEmail = user.acting_as_store_email || user.email;
    if (user.store_user_owner_email) {
      workingEmail = user.store_user_owner_email;
    }

    // Load counts
    const counts = await base44.entities.InventoryCount.filter({ created_by: workingEmail }, '-count_date');

    // Filter by date range if provided
    const inRange = counts.filter((c) => {
      const d = new Date(c.count_date);
      if (startDate && new Date(c.count_date) < new Date(startDate)) return false;
      if (endDate && new Date(c.count_date) > new Date(endDate)) return false;
      return true;
    });

    // Sort ascending by date
    inRange.sort((a, b) => new Date(a.count_date) - new Date(b.count_date));

    const dataRows = inRange.map((c) => [
      c.count_date || '',
      (c.name || ''),
      Number(c.total_inventory_value || 0)
    ]);

    const totalSum = dataRows.reduce((sum, r) => sum + (Number(r[3]) || 0), 0);

    const startLabel = startDate ? new Date(startDate).toLocaleDateString() : '';
    const endLabel = endDate ? new Date(endDate).toLocaleDateString() : '';
    const title = customTitle || `Inventory Counts Report${startLabel || endLabel ? ` (${startLabel || '—'} - ${endLabel || '—'})` : ''}`;

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

    // Prepare values (A1:C...)
    const values = [];
    values.push([title, '', '']); // A1 merged later
    values.push(['Date', 'Name', 'Total']); // headers
    for (const row of dataRows) values.push(row);
    values.push(['', 'Total', totalSum]); // total row

    const rowsCount = values.length; // total rows written

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
            range: `${sheetTitle}!A1:C${rowsCount}`,
            values
          }
        ]
      })
    });

    if (!valuesRes.ok) {
      const errText = await valuesRes.text();
      return Response.json({ error: 'Failed to write values', details: errText }, { status: 500 });
    }

    // Format sheet
    const dataLen = dataRows.length;
    const totalRowIndex = 2 + dataLen; // 0-based index of total row

    const batchReq = {
      requests: [
        // Merge title A1:C1
        {
          mergeCells: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
                    mergeType: 'MERGE_ALL'
                  }
        },
        // Style title row
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
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
        // Style header row (row 2)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 3 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                textFormat: { bold: true }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        },
        // Number format for totals column (C)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 2, endRowIndex: totalRowIndex + 1, startColumnIndex: 2, endColumnIndex: 3 },
            cell: {
              userEnteredFormat: {
                numberFormat: { type: 'NUMBER', pattern: '#,##0.00' }
              }
            },
            fields: 'userEnteredFormat.numberFormat'
          }
        },
        // Bold total row
        {
          repeatCell: {
            range: { sheetId, startRowIndex: totalRowIndex, endRowIndex: totalRowIndex + 1, startColumnIndex: 0, endColumnIndex: 3 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.96, green: 0.96, blue: 0.86 }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        },
        // Auto resize columns
        {
          autoResizeDimensions: {
            dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 3 }
          }
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 90 },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
            properties: { pixelSize: 300 },
            fields: 'pixelSize'
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

    if (!fmtRes.ok) {
      const errText = await fmtRes.text();
      return Response.json({ error: 'Failed to format sheet', details: errText }, { status: 500 });
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    return Response.json({ success: true, spreadsheetId, spreadsheetUrl });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});