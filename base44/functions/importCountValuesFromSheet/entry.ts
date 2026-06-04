import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sheet_url } = await req.json();
        
        if (!sheet_url) {
            return Response.json({ error: 'Sheet URL is required' }, { status: 400 });
        }

        const match = sheet_url.match(/\/d\/(.*?)(?:\/|$)/);
        if (!match || !match[1]) {
            return Response.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
        }
        const spreadsheetId = match[1];

        const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

        // 1. Get spreadsheet metadata to find all sheets
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!metaRes.ok) {
            throw new Error(`Failed to fetch spreadsheet info`);
        }

        const metaData = await metaRes.json();
        const sheetNames = metaData.sheets.map(s => s.properties.title);

        const updates = [];

        // 2. Fetch values from each sheet
        for (const sheetName of sheetNames) {
            // Skip the Summary sheet to avoid double counting if we rely on warehouse sheets
            if (sheetName.toLowerCase().includes('summary') || sheetName.includes('סיכום')) {
                continue;
            }

            const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'!A1:G1000`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!valRes.ok) continue;

            const valData = await valRes.json();
            const rows = valData.values || [];

            // Find header row to know indexes, usually row 1 (index 1 since row 0 is title)
            if (rows.length < 2) continue;

            // Simple heuristic: starting from row 2 (index 2)
            for (let i = 2; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;
                
                const itemName = row[0];
                if (!itemName || itemName.includes('Total') || itemName.includes('סה"כ')) continue;

                const casesStr = String(row[1] ?? '').trim();
                const unitsStr = String(row[2] ?? '').trim();
                const notes = String(row[6] ?? '').trim();
                
                let parsedCases = casesStr === '' || casesStr.toUpperCase() === 'N/A' ? '' : Number(casesStr.replace(/,/g, ''));
                let parsedUnits = unitsStr === '' ? '' : Number(unitsStr.replace(/,/g, ''));
                
                if (isNaN(parsedCases)) parsedCases = '';
                if (isNaN(parsedUnits)) parsedUnits = '';
                
                // If both are empty strings or invalid, we skip updating this item to 0 unless explicitly 0?
                if (casesStr === '' && unitsStr === '') continue;
                
                updates.push({
                    warehouse_name: sheetName,
                    item_name: itemName,
                    cases: parsedCases === '' ? null : parsedCases,
                    units: parsedUnits === '' ? null : parsedUnits,
                    notes: notes
                });
            }
        }

        return Response.json({ success: true, updates });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});