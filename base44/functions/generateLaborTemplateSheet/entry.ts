import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

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
        { properties: { title: 'Workers', gridProperties: { columnCount: 10 } } },
        { properties: { title: 'Job Positions', gridProperties: { columnCount: 10 } } }
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
    
    const title = `Labor Setup Template - ${new Date().toLocaleDateString('en-US')}`;
    const spreadsheetId = await createSpreadsheet(accessToken, title);

    // Build Workers Sheet Data
    const workersData = [
      ['Full Name', 'Phone', 'Job Position Name', 'Payment Type (hourly/monthly/daily)', 'Payment Amount'],
      ['John Doe', '050-1234567', 'Chef', 'hourly', '70'],
      ['Jane Smith', '052-7654321', 'Waiter', 'hourly', '40']
    ];

    // Build Job Positions Sheet Data
    const positionsData = [
      ['Position Name', 'Department/Section (kitchen/service/bar/management/cleaning/other)', 'Default Payment Type (hourly/monthly/daily)', 'Default Payment Amount'],
      ['Chef', 'kitchen', 'hourly', '70'],
      ['Waiter', 'service', 'hourly', '40']
    ];

    await writeValues(accessToken, spreadsheetId, "'Workers'!A1:E100", workersData);
    await writeValues(accessToken, spreadsheetId, "'Job Positions'!A1:D100", positionsData);

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {}

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    return Response.json({ success: true, url });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});