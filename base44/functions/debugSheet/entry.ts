import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

  const { spreadsheetUrl } = await req.json();
  const spreadsheetId = spreadsheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)[1];

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!metaRes.ok) return Response.json({ status: metaRes.status, ok: metaRes.ok, error: await metaRes.text() });
  
  const metaData = await metaRes.json();
  const sheetNames = metaData.sheets.map(s => s.properties.title);
  
  let allRowsData = {};
  for (const sheetName of sheetNames) {
    if (sheetName === 'Preps') {
      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!A1:Z20')}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (getRes.ok) {
        allRowsData[sheetName] = (await getRes.json()).values;
      }
    }
  }

  return Response.json({ sheetNames, allRowsData });
});