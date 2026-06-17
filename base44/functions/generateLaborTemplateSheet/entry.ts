import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function createSpreadsheet(accessToken, title, isHebrew) {
  const res = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: isHebrew ? 'עובדים' : 'Workers', gridProperties: { columnCount: 18 } } },
        { properties: { title: isHebrew ? 'תפקידים' : 'Job Positions', gridProperties: { columnCount: 10 } } }
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

    const { language } = await req.json().catch(() => ({}));
    const isHebrew = language === 'he';

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    
    const title = isHebrew 
      ? `תבנית עובדים ותפקידים - ${new Date().toLocaleDateString('he-IL')}`
      : `Labor Setup Template - ${new Date().toLocaleDateString('en-US')}`;
    const spreadsheetId = await createSpreadsheet(accessToken, title, isHebrew);

    // Build Workers Sheet Data
    const workersHeaders = isHebrew
      ? ['שם מלא', 'טלפון', 'אימייל', 'תעודת זהות', 'שם בנק', 'סניף', 'חשבון', 'תאריך התחלה', 'תפקיד עיקרי', 'תעריף תפקיד עיקרי', 'תפקיד 2', 'תעריף תפקיד 2', 'תפקיד 3', 'תעריף תפקיד 3', 'תפקיד 4', 'תעריף תפקיד 4', 'סוג תשלום עיקרי (hourly/monthly/daily)', 'הערות']
      : ['Full Name', 'Phone', 'Email', 'ID Number', 'Bank Name', 'Branch', 'Account', 'Start Date', 'Main Job Position', 'Main Role Rate', '2nd role', '2nd role rate', '3rd role', '3rd role rate', '4th role', '4th role rate', 'MAIN Job Payment Type (hourly/monthly/daily)', 'Notes'];

    const workersData = [
      workersHeaders,
      ['John Doe', '050-1234567', 'john@example.com', '123456789', 'Leumi', '123', '123456', '01/01/2023', 'Chef', '70', 'Manager', '75', '', '', '', '', 'hourly', ''],
      ['Jane Smith', '052-7654321', 'jane@example.com', '987654321', 'Hapoalim', '456', '654321', '15/05/2024', 'Waiter', '55', 'Host', '60', 'Bartender', '65', '', '', 'hourly', '']
    ];

    // Build Job Positions Sheet Data
    const positionsHeaders = isHebrew
      ? ['שם תפקיד', 'מחלקה (kitchen/service/bar/management/cleaning/other)', 'סוג תשלום ברירת מחדל (hourly/monthly/daily)', 'על טיפים (yes/no)', 'תעריף/סכום ברירת מחדל']
      : ['Position Name', 'Department/Section (kitchen/service/bar/management/cleaning/other)', 'Default Payment Type (hourly/monthly/daily)', 'On Tips (yes/no)', 'Default Payment Amount'];

    const positionsData = [
      positionsHeaders,
      ['Chef', 'kitchen', 'monthly', 'no', '70'],
      ['Waiter', 'service', 'hourly', 'yes', '55']
    ];

    const workersSheetName = isHebrew ? 'עובדים' : 'Workers';
    const positionsSheetName = isHebrew ? 'תפקידים' : 'Job Positions';

    await writeValues(accessToken, spreadsheetId, `'${workersSheetName}'!A1:R100`, workersData);
    await writeValues(accessToken, spreadsheetId, `'${positionsSheetName}'!A1:D100`, positionsData);

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