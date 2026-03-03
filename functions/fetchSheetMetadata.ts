import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spreadsheetId } = await req.json();

        const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google Sheets API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        return Response.json({ success: true, sheets: data.sheets.map(s => ({ title: s.properties.title, sheetId: s.properties.sheetId })) });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});