import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function createSpreadsheet(accessToken, title) {
  const res = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'ספקים ופריטים', gridProperties: { columnCount: 7 } } }
      ]
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create spreadsheet failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.spreadsheetId;
}

async function writeValues(accessToken, spreadsheetId, a1Range, values) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(a1Range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: a1Range,
      majorDimension: 'ROWS',
      values
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Write values failed: ${res.status} ${text}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    
    const title = `תבנית ייבוא ספקים ופריטים - ${new Date().toLocaleDateString('he-IL')}`;
    const spreadsheetId = await createSpreadsheet(accessToken, title);

    const data = [
      ['שם ספק', 'שם פריט', 'מחיר', 'יחידת מידה', 'מק"ט', 'הנחה (%)', 'כמות באריזה'],
      ['ירקן דוגמה', 'עגבניה', '5', 'ק"ג', '1001', '0', '1'],
      ['ירקן דוגמה', 'מלפפון', '4.5', 'ק"ג', '1002', '5', '1'],
      ['ספק בשר', 'חזה עוף', '35', 'ק"ג', '2001', '0', '1'],
      ['ספק בשר', 'בשר טחון', '40', 'ק"ג', '2002', '0', '1'],
    ];

    await writeValues(accessToken, spreadsheetId, "'ספקים ופריטים'!A1:G5", data);

    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return Response.json({ success: true, url });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});