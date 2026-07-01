import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemsData } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

    // 1. Create a new spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: `Prep Inventory - ${new Date().toLocaleDateString()}`,
        },
      }),
    });
    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // 2. Format the data for sheets
    const headers = [
      "שם הכנה",
      "עלות כוללת (₪)",
      "יחידת מידה (תפוקה)",
      "כמות במלאי (להזנה)",
    ];

    const rows = itemsData.map((item) => [
      item.name || '',
      item.total_cost || 0,
      item.yield_unit || 'unit',
      '', // Empty column for user input
    ]);

    const values = [headers, ...rows];

    // 3. Update the values
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:D?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values,
      }),
    });

    // 4. Format the columns
    const requests = [
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 } } },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 1, endColumnIndex: 2 }, // Cost
          cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "[$₪-he-IL]#,##0.00" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 3, endColumnIndex: 4 }, // Blank column
          cell: { userEnteredFormat: { backgroundColor: { red: 1, green: 1, blue: 0.8 } } }, // Light yellow for input
          fields: "userEnteredFormat.backgroundColor",
        },
      },
      { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 4 } } },
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    return Response.json({ success: true, url: spreadsheetUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});