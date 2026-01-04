import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const title = 'תבנית ספקים - הוספה מרוכזת';

    // Create spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ properties: { title } })
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      return Response.json({ error: 'Failed to create spreadsheet', details: txt }, { status: 500 });
    }

    const spreadsheet = await createRes.json();
    const spreadsheetId = spreadsheet.spreadsheetId;
    const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Headers (Hebrew) and examples
    const headers = [
      'שם ספק',
      'אימייל',
      'טלפון',
      'איש קשר',
      'סוג ספק (simple/catalogic)',
      'מספר ספק בחשבונאות',
      'הערות'
    ];

    const row1 = ['ירקות מזרח', 'east@veggies.co.il', '03-5555555', 'דנה', 'simple', 'AC-1023', 'ספק ירקות ופירות'];
    const row2 = ['סודה פלוס', 'orders@sodaplus.co.il', '050-1234567', 'אדם', 'catalogic', 'AC-5501', 'משקאות – קטלוג אקסל'];

    // Write headers + sample
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Sheet1!A1:G1', values: [headers] },
          { range: 'Sheet1!A2:G3', values: [row1, row2] }
        ]
      })
    });

    if (!updateRes.ok) {
      const txt = await updateRes.text();
      return Response.json({ error: 'Failed to write headers/rows', details: txt }, { status: 500 });
    }

    // Share with user (writer)
    try {
      let shareEmail = (user?.drive_share_email || '').trim();
      const actingEmail = user?.acting_as_store_email || user?.acting_as_user_email || '';
      if (!shareEmail && actingEmail) {
        try {
          const list = await base44.asServiceRole.entities.User.filter({ email: actingEmail });
          if (Array.isArray(list) && list.length > 0) {
            shareEmail = (list[0].drive_share_email || actingEmail || '').trim();
          }
        } catch {}
      }
      if (!shareEmail) shareEmail = (user?.email || '').trim();

      const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
      await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${driveToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: shareEmail })
      });

      try {
        const infoRes = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetsId}?fields=webViewLink&supportsAllDrives=true`, {
          headers: { 'Authorization': `Bearer ${driveToken}` }
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info?.webViewLink) {
            return Response.json({ success: true, spreadsheetId, url: info.webViewLink, title, shared_with: shareEmail });
          }
        }
      } catch {}

      return Response.json({ success: true, spreadsheetId, url: spreadsheetUrl, title, shared_with: shareEmail });
    } catch (e) {
      return Response.json({ success: true, spreadsheetId, url: spreadsheetUrl, title, share_error: e?.message || String(e) });
    }
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});