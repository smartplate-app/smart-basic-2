import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemsData } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // 1. Create a new spreadsheet
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: `Menu Engineering Report - ${new Date().toLocaleDateString()}`,
        },
      }),
    });
    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // 2. Format the data for sheets
    const headers = [
      "Item Name",
      "Category",
      "Sold Count",
      "Food Cost (₪)",
      "Menu Price (₪)",
      "Theoretical SFC (%)",
      "Total Cost COGS (₪)",
      "Contribution Margin (%)",
      "Mix (%)",
      "Classification",
    ];

    const rows = itemsData.map((item) => [
      item.name,
      item.menu_category || 'general',
      item.qty,
      item.cost,
      item.salePrice,
      item.sfc > 0 ? (item.sfc / 100) : 0, // Format as decimal for sheets % format
      item.totalItemCost,
      item.itemProfit > 0 ? (item.itemProfit / item.salePrice) : 0, // Format as decimal for sheets % format
      item.mixPercent > 0 ? (item.mixPercent / 100) : 0, // Format as decimal for sheets % format
      item.categoryEn,
    ]);

    const values = [headers, ...rows];

    // 3. Update the values
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:J?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values,
      }),
    });

    // 4. Format the columns (Number formats, bold headers, etc.)
    const requests = [
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 10 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 } } },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 3, endColumnIndex: 5 }, // Cost, Price
          cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "[$₪-he-IL]#,##0.00" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 6, endColumnIndex: 7 }, // COGS
          cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "[$₪-he-IL]#,##0.00" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 5, endColumnIndex: 6 }, // SFC
          cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.00%" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      {
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 7, endColumnIndex: 9 }, // Contribution, Mix
          cell: { userEnteredFormat: { numberFormat: { type: "PERCENT", pattern: "0.0%" } } },
          fields: "userEnteredFormat.numberFormat",
        },
      },
      { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 10 } } },
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    return Response.json({ success: true, url: spreadsheet.spreadsheetUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});