import { createClientFromRequest } from 'npm:@base44/sdk@0.8.29';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { rows, title } = body;

        if (!rows || !Array.isArray(rows)) {
            return Response.json({ error: 'Invalid rows data' }, { status: 400 });
        }

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
        
        if (!accessToken) {
            return Response.json({ error: 'Google Sheets connector is not configured or missing token.' }, { status: 500 });
        }

        // 1. Create Spreadsheet
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    title: title || 'Labor Report'
                },
                sheets: [
                    {
                        properties: {
                            sheetId: 0,
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        }
                    }
                ]
            })
        });

        if (!createRes.ok) {
            const errBody = await createRes.text();
            throw new Error(`Failed to create spreadsheet: ${errBody}`);
        }

        const sheetData = await createRes.json();
        const spreadsheetId = sheetData.spreadsheetId;
        const spreadsheetUrl = sheetData.spreadsheetUrl;

        // 2. Update values
        if (rows.length > 0) {
            const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: rows
                })
            });

            if (!updateRes.ok) {
                const errBody = await updateRes.text();
                console.error("Update spreadsheet error", errBody);
                // Even if update fails, we created the sheet, so we could still return it, 
                // but better to throw so the user knows it's incomplete.
                throw new Error(`Failed to write data to spreadsheet: ${errBody}`);
            }
        }

        return Response.json({ success: true, url: spreadsheetUrl });

    } catch (error) {
        console.error('exportLaborReportToSheets error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});