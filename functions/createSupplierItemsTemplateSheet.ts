import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { supplierName } = await req.json().catch(() => ({ supplierName: '' }));

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const title = `תבנית פריטים${supplierName ? ' - ' + supplierName : ''}`;

    // Create spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title },
      })
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      return Response.json({ error: 'Failed to create spreadsheet', details: txt }, { status: 500 });
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Prepare headers and sample rows (Hebrew)
    const headers = [
      'שם פריט',
      'מספר קטלוגי',
      'יחידה', // יח׳, ק"ג, ליטר, ארגז
      'מחיר',
      'הנחה (%)',
      'יחידות בחבילה',
      'מלאי מינימלי',
      'הערות'
    ];
    const row1 = ['עגבניות', 'VEG-001', 'ק"ג', 9.9, 0, 1, 0, 'טרי'];
    const row2 = ['קוקה קולה 330מ״ל', 'DRK-330', 'ארגז', 72, 10, 24, 2, 'מארז 24'];

    // Write values
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Sheet1!A1:H1', values: [headers] },
          { range: 'Sheet1!A2:H3', values: [row1, row2] }
        ]
      })
    });

    if (!updateRes.ok) {
      const txt = await updateRes.text();
      return Response.json({ error: 'Failed to write headers/rows', details: txt }, { status: 500 });
    }

    return Response.json({ success: true, spreadsheetId, url: spreadsheetUrl, title });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});