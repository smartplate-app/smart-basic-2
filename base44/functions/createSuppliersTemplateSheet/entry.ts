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
      body: JSON.stringify({
        properties: { title },
        sheets: [
          { properties: { sheetId: 0, title: 'Sheet1', rightToLeft: true, gridProperties: { columnCount: 7 } } }
        ]
      })
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

    const row1 = ['ירקות מזרח (דוגמה)', 'east@veggies.co.il', '03-5555555', 'דנה', 'simple', 'AC-1023', 'ספק ירקות ופירות'];
    const row2 = ['סודה פלוס (דוגמה)', 'orders@sodaplus.co.il', '050-1234567', 'אדם', 'catalogic', 'AC-5501', 'משקאות – קטלוג אקסל'];

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

    // Apply formatting
    const formatReq = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: 0,
                gridProperties: {
                  frozenRowCount: 1,
                  frozenColumnCount: 1 // Freeze Supplier Name
                }
              },
              fields: 'gridProperties(frozenRowCount,frozenColumnCount)'
            }
          },
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1.0, green: 0.95, blue: 0.8 }, // Light yellow
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 1, endRowIndex: 3 }, // The examples
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, // Light grey
                  textFormat: { italic: true, foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            repeatCell: {
              range: { sheetId: 0, startColumnIndex: 0, endColumnIndex: 1 }, // Column A (Supplier Name)
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1.0, green: 0.95, blue: 0.8 }, // Light yellow
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, // Light grey
                  textFormat: { italic: true, foregroundColor: { red: 0.4, green: 0.4, blue: 0.4 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }
        ]
      })
    });
    if (!formatReq.ok) {
      console.error('Failed to format sheet:', await formatReq.text());
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

      // Share with store managers
      try {
        await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
      } catch(e) {
        console.error('Failed to share sheet with managers:', e);
      }

      try {
        const infoRes = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=webViewLink&supportsAllDrives=true`, {
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