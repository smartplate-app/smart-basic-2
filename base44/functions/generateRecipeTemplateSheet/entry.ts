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
        { properties: { title: 'הכנות מטבח', gridProperties: { columnCount: 5 } } },
        { properties: { title: 'מנות סופיות', gridProperties: { columnCount: 5 } } },
        { properties: { title: 'חומרי גלם', gridProperties: { columnCount: 5 } } }
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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    
    const title = `תבנית מתכונים והכנות - ${new Date().toLocaleDateString('he-IL')}`;
    const spreadsheetId = await createSpreadsheet(accessToken, title);

    // Build Preps Sheet Data
    let prepsData = [];
    for (let i = 1; i <= 10; i++) {
      prepsData.push(['שם הכנת מטבח', `הכנה ${i}`]);
      prepsData.push(['יחידת מידה', 'ק"ג']);
      prepsData.push(['משקל כולל', '1']);
      prepsData.push([]);
      prepsData.push(['שם פריט המלאי', 'מספר קטלוגי', 'כמות יחידות', 'יחידת מידה']);
      for (let j = 0; j < 5; j++) prepsData.push(['', '', '', '']);
      prepsData.push([]);
      prepsData.push([]);
    }

    // Build Recipes Sheet Data
    let recipesData = [];
    for (let i = 1; i <= 10; i++) {
      recipesData.push(['שם המנה בתפריט', `מנה ${i}`]);
      recipesData.push(['מחיר מכירה', '50']);
      recipesData.push([]);
      recipesData.push(['שם פריט המלאי', 'מספר קטלוגי', 'כמות יחידות', 'יחידת מידה']);
      for (let j = 0; j < 5; j++) recipesData.push(['', '', '', '']);
      recipesData.push([]);
      recipesData.push([]);
    }

    // Build Items Sheet Data
    let itemsData = [
      ['שם הפריט', 'יחידת מידה', 'מחיר', 'מספר קטלוגי', 'שם הספק'],
      ['עגבניה', 'ק"ג', '5', '123', 'ירקן'],
      ['מלפפון', 'ק"ג', '4', '124', 'ירקן'],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', '']
    ];

    await writeValues(accessToken, spreadsheetId, "'הכנות מטבח'!A1:E150", prepsData);
    await writeValues(accessToken, spreadsheetId, "'מנות סופיות'!A1:E150", recipesData);
    await writeValues(accessToken, spreadsheetId, "'חומרי גלם'!A1:E100", itemsData);

    // Share with store managers
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