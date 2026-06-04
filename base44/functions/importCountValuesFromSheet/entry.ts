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
            // Skip the Summary sheet ONLY if there are multiple sheets to avoid double counting
            if (sheetNames.length > 1 && (sheetName.toLowerCase().includes('summary') || sheetName.includes('סיכום'))) {
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

            let itemIdx = -1;
            let casesIdx = -1;
            let unitsIdx = -1;
            let notesIdx = -1;
            let whIdx = -1;

            const h0 = rows[0] ? rows[0].join('').toLowerCase() : '';
            const h1 = rows[1] ? rows[1].join('').toLowerCase() : '';
            
            let headerRowIndex = -1;
            if (h0.includes('פריט') || h0.includes('item') || h0.includes('מוצר') || h0.includes('שם')) headerRowIndex = 0;
            else if (h1.includes('פריט') || h1.includes('item') || h1.includes('מוצר') || h1.includes('שם')) headerRowIndex = 1;

            if (headerRowIndex > -1) {
                const h = rows[headerRowIndex].map(c => String(c).toLowerCase().trim());
                itemIdx = h.findIndex(c => c.includes('פריט') || c.includes('מוצר') || c.includes('item name') || c.includes('item_name') || c === 'שם');
                casesIdx = h.findIndex(c => c.includes('ארגז') || c.includes('case') || c.includes('carton'));
                unitsIdx = h.findIndex(c => c.includes('יחיד') || c.includes('unit') || c === 'כמות' || c === 'qty');
                notesIdx = h.findIndex(c => c.includes('הערות') || c.includes('note'));
                whIdx = h.findIndex(c => c.includes('מחסן') || c.includes('warehouse'));
            }

            // Fallback heuristics if header detection failed or was incomplete
            if (itemIdx === -1 || casesIdx === -1 || unitsIdx === -1) {
                const dataRow = rows[headerRowIndex > -1 ? headerRowIndex + 1 : 0] || [];
                for (let c = 0; c < dataRow.length; c++) {
                    const val = String(dataRow[c]).trim();
                    if (val === '') continue;
                    const isNum = !isNaN(Number(val.replace(/,/g, '')));
                    
                    if (!isNum && itemIdx === -1 && val.length > 2 && val.toUpperCase() !== 'N/A') {
                        itemIdx = c;
                    } else if (isNum || val.toUpperCase() === 'N/A') {
                        if (casesIdx === -1) casesIdx = c;
                        else if (unitsIdx === -1) unitsIdx = c;
                    }
                }
                
                if (itemIdx === -1) itemIdx = 0;
                if (casesIdx === -1) casesIdx = 1;
                if (unitsIdx === -1) unitsIdx = 2;
                if (notesIdx === -1) notesIdx = 6;
            }

            const startIndex = headerRowIndex > -1 ? headerRowIndex + 1 : 0;
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

        if (updates.length > 0) {
            try {
                const workingEmail = user.acting_as_store_email || user.store_user_owner_email || user.email;
                const catalogItems = await base44.asServiceRole.entities.Item.filter({
                    $or: [{ created_by: workingEmail }, { store_owner_email: workingEmail }]
                }, "name", 10000);

                const catalogList = catalogItems.map(i => ({ id: i.id, name: i.name, nickname: i.nickname }));
                const uniqueNames = [...new Set(updates.map(u => u.item_name))];

                const prompt = `You are an expert data matching assistant.
I have a list of extracted item names from an inventory spreadsheet. 
I also have my official catalog of items.
Map each extracted item name to the correct catalog item ID. 
Some extracted names might have extra prefixes (like "40-30-4.5 "), typos, missing spaces, or minor differences compared to the official catalog.
Only map if you are confident they are the same item. If not found, set catalog_id to "" (empty string).

Extracted Names:
${JSON.stringify(uniqueNames)}

Official Catalog:
${JSON.stringify(catalogList)}`;

                const geminiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt,
                    model: "gemini_3_1_pro",
                    response_json_schema: {
                        type: "object",
                        properties: {
                            mappings: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        extracted_name: { type: "string" },
                                        catalog_id: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                if (geminiRes && geminiRes.mappings) {
                    const mapDict = {};
                    for (const m of geminiRes.mappings) {
                        mapDict[m.extracted_name] = m.catalog_id;
                    }
                    for (const u of updates) {
                        if (mapDict[u.item_name]) {
                            u.catalog_id = mapDict[u.item_name];
                        }
                    }
                }
            } catch (llmError) {
                console.error("LLM matching failed, proceeding with original updates", llmError);
            }
        }

        return Response.json({ success: true, updates });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});