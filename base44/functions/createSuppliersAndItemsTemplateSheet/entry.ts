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
      ['ספק', 'שם הפריט', 'כינוי (בשפה שלך , יופיע לך בלבד)', 'יחידת הפריט (קילוגרם / גרם / ליטר / מיליליטר / ארגז)', 'כמות יחידות באריזה', 'תכולה ליחידה', 'יחידת מידה לתכולה', 'מחיר לפריט', 'מספר קטלוגי', 'מחסן', 'מחסן 2', 'מחסן 3', 'הנחה (%)', 'מלאי מינימום', 'כמות באריזה'],
      ['smart plate demo', 'גומיות חומות', 'הגומיות של האריזות', 'יחידה', '', '', '', '5', '123', 'מקרר אחורי', 'מקרר פס חם', '', '0', '5', '1'],
      ['smart plate demo', 'חמים ונעים', 'מה שחם בחורף', 'ארגז', '', '', '', '552', '233', 'מחסן בחוץ', '', '', '0', '', '1'],
      ['smart plate demo', 'נסיון test', '', 'יחידה', '', '', '', '35', '3256', 'מחסן בחוץ', '', '', '0', '', '1'],
    ];

    await writeValues(accessToken, spreadsheetId, "'ספקים ופריטים'!A1:O4", data);

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