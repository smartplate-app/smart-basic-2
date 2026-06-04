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

            const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(sheetName)}'!A1:J1000`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!valRes.ok) continue;

            const valData = await valRes.json();
            const rows = valData.values || [];

            // Find header row to know indexes
            if (rows.length < 2) continue;

            // Detect format based on headers (row 0 or 1)
            let itemIdx = 0;
            let casesIdx = 1;
            let unitsIdx = 2;
            let notesIdx = 6;
            let whIdx = -1;

            const headerRow = rows[0].join('').includes('שם פריט') || rows[0].join('').includes('Item Name') || rows[0].join('').includes('item_name') ? rows[0] : rows[1];
            
            if (headerRow) {
                const h = headerRow.map(c => String(c).toLowerCase().trim());
                if (h.includes('supplier_name') || h.includes('שם ספק')) {
                    // This is the generated template format (generateInventoryCountSheet)
                    itemIdx = h.indexOf('item_name') > -1 ? h.indexOf('item_name') : h.indexOf('שם פריט');
                    casesIdx = h.indexOf('counted_cases') > -1 ? h.indexOf('counted_cases') : h.indexOf('ארגזים שנספרו');
                    unitsIdx = h.indexOf('counted_units') > -1 ? h.indexOf('counted_units') : h.indexOf('יחידות שנספרו');
                    notesIdx = h.indexOf('notes') > -1 ? h.indexOf('notes') : h.indexOf('הערות');
                    whIdx = h.indexOf('warehouse_name') > -1 ? h.indexOf('warehouse_name') : h.indexOf('שם מחסן');
                } else {
                    // This is the exported format (exportSingleCountToSheets)
                    itemIdx = h.indexOf('item name') > -1 ? h.indexOf('item name') : h.indexOf('שם פריט');
                    casesIdx = h.indexOf('counted cases') > -1 ? h.indexOf('counted cases') : h.indexOf('ארגזים שנספרו');
                    unitsIdx = h.indexOf('counted units') > -1 ? h.indexOf('counted units') : h.indexOf('יחידות שנספרו');
                    notesIdx = h.indexOf('notes') > -1 ? h.indexOf('notes') : h.indexOf('הערות');
                    
                    if (itemIdx === -1) itemIdx = 0;
                    if (casesIdx === -1) casesIdx = 1;
                    if (unitsIdx === -1) unitsIdx = 2;
                    if (notesIdx === -1) notesIdx = 6;
                }
            }

            // Simple heuristic: starting from row 2 (index 2) or row 1 if header is at 0
            const startIndex = rows[0].join('').includes('שם פריט') || rows[0].join('').includes('Item Name') || rows[0].join('').includes('item_name') ? 1 : 2;
            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;
                
                const itemName = row[itemIdx];
                if (!itemName || itemName.includes('Total') || itemName.includes('סה"כ')) continue;

                const casesStr = String(row[casesIdx] ?? '').trim();
                const unitsStr = String(row[unitsIdx] ?? '').trim();
                const notes = String(row[notesIdx] ?? '').trim();
                const specificWh = String(row[whIdx] ?? '').trim();
                
                let parsedCases = casesStr === '' || casesStr.toUpperCase() === 'N/A' ? '' : Number(casesStr.replace(/,/g, ''));
                let parsedUnits = unitsStr === '' ? '' : Number(unitsStr.replace(/,/g, ''));
                
                if (isNaN(parsedCases)) parsedCases = '';
                if (isNaN(parsedUnits)) parsedUnits = '';
                
                // If both are empty strings or invalid, we skip updating this item to 0 unless explicitly 0?
                if (casesStr === '' && unitsStr === '') continue;
                
                updates.push({
                    warehouse_name: whIdx > -1 ? specificWh : sheetName,
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