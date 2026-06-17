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
      'שם הפריט',
      'כינוי (בשפה שלך , יופיע לך בלבד)',
      'יחידת הפריט (קילוגרם / גרם / ליטר / מיליליטר / ארגז)',
      'כמות יחידות באריזה',
      'תכולה ליחידה',
      'יחידת מידה לתכולה',
      'מחיר לפריט',
      'מספר קטלוגי',
      'מחסן',
      'מחסן 2',
      'מחסן 3',
      'הנחה (%)',
      'מלאי מינימום'
    ];
    const row1 = ['עגבניות (דוגמה)', '', 'ק"ג', '', '', '', 9.9, 'VEG-001', 'מקרר ירקות', '', '', 0, 10];
    const row2 = ['קוקה קולה 330מ״ל (דוגמה)', '', 'ארגז', 24, 330, 'מיליליטר', 72, 'DRK-330', 'מחסן משקאות', '', '', 10, 2];

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
          { range: 'Sheet1!A1:M1', values: [headers] },
          { range: 'Sheet1!A2:M3', values: [row1, row2] }
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
                  frozenColumnCount: 1 // Freeze up to Item Name ('שם הפריט')
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
              range: { sheetId: 0, startColumnIndex: 0, endColumnIndex: 1 }, // Column A (Item Name)
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1.0, green: 0.95, blue: 0.8 }, // Light yellow
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          // Re-apply light grey to the intersection of examples and column A
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

    // Share the sheet with the intended user (owner's token creates it; we share to user's Google email)
    try {
      // Decide who should get access: prefer saved drive_share_email, otherwise acting user, otherwise current user's email
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
      // Grant writer access (no email notification)
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

      // Get a webViewLink for convenience
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

      // Fallback to Sheets URL if Drive webViewLink not available
      return Response.json({ success: true, spreadsheetId, url: spreadsheetUrl, title, shared_with: shareEmail });
    } catch (e) {
      // Even if sharing fails, return the created URL so admin can access
      return Response.json({ success: true, spreadsheetId, url: spreadsheetUrl, title, share_error: e?.message || String(e) });
    }
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});