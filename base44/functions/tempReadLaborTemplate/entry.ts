import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const spreadsheetId = '17Jklv4QHK7qvDkqwNeyZDoavFgZeEfPbCI6uWiWiiTc';
    
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const metaData = await metaRes.json();
    
    let allData = {};
    for (const sheet of metaData.sheets) {
      const sheetName = sheet.properties.title;
      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!A1:Z5')}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await getRes.json();
      allData[sheetName] = data.values;
    }
    
    return Response.json(allData);
  } catch (err) {
    return Response.json({ error: err.message });
  }
});