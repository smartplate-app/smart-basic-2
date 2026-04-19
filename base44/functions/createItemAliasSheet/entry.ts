import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    // Fetch items across all users and seed alias candidates from orders/receipts
    const normalize = (s) => String(s || '').trim().replace(/\s+/g, ' ');
    const isHebrew = (s) => /[\u0590-\u05FF]/.test(String(s || ''));

    const itemsAll = await base44.asServiceRole.entities.Item.list();
    const itemRows = (itemsAll || []).map(it => [it.id || '', it.name || '', it.supplier_name || '']);

    const knownNames = new Set((itemsAll || []).map(it => normalize(it.name).toLowerCase()));

    let aliasCandidates = [];
    try {
      const orders = await base44.asServiceRole.entities.Order.list();
      (orders || []).forEach(o => {
        (o.items || []).forEach(it => {
          const nm = normalize(it.item_name || it.name);
          if (!nm) return;
          const key = nm.toLowerCase();
          if (!knownNames.has(key)) {
            aliasCandidates.push({ alias: nm, lang: isHebrew(nm) ? 'he' : 'en', normalized: key, note: 'source: order' });
          }
        });
      });
    } catch {}

    try {
      const receipts = await base44.asServiceRole.entities.SupplyReceipt.list();
      (receipts || []).forEach(r => {
        (r.verified_items || []).forEach(it => {
          const nm = normalize(it.item_name || it.name);
          if (!nm) return;
          const key = nm.toLowerCase();
          if (!knownNames.has(key)) {
            aliasCandidates.push({ alias: nm, lang: isHebrew(nm) ? 'he' : 'en', normalized: key, note: 'source: receipt' });
          }
        });
      });
    } catch {}

    const uniqueMap = new Map();
    aliasCandidates.forEach(a => { if (!uniqueMap.has(a.normalized)) uniqueMap.set(a.normalized, a); });
    const uniqueAliases = Array.from(uniqueMap.values()).slice(0, 5000);
    const aliasRows = uniqueAliases.map(a => [a.alias, a.lang, a.normalized, '', '', '', a.note]);

    // Google Sheets OAuth token via app connector (already authorized)
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const title = `Item Name Matching ${new Date().toISOString().split('T')[0]}`;

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
          { properties: { title: 'Instructions' } },
          { properties: { title: 'Aliases' } },
          { properties: { title: 'Items' } }
        ]
      })
    });

    if (!createRes.ok) {
      const details = await createRes.text();
      return Response.json({ error: 'Google API error (create)', details }, { status: 500 });
    }

    const created = await createRes.json();
    const spreadsheetId = created.spreadsheetId;
    const openUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    const instructions = [
      [
        'Paste scanned item names (including Hebrew) into Aliases!A column.\n' +
        'Then select or enter the matching Item ID from Items sheet (or type exact name).\n' +
        'Columns: A=Scanned alias, B=Language, C=Normalized (optional), D=AI suggestion (leave/override), E=Match Item ID, F=Match Item Name, G=Notes.\n' +
        'The Items sheet lists your current items (ID, Name, Supplier). Use it to validate matches.\n' +
        'הוראות בעברית: הדביקו שמות שנסרקו בעמודת A בגיליון Aliases, ואז בחרו/כתבו את ה-Item ID המתאים מתוך גיליון Items (או שם מדויק).\n' +
        'אפשר לציין שפה בעמודה B ולהוסיף נירמול בעמודה C. עמודה D מיועדת להצעת AI בעתיד.'
      ]
    ];

    const headerAliases = [[
      'Scanned alias', 'Language', 'Normalized', 'AI suggestion', 'Match Item ID', 'Match Item Name', 'Notes'
    ]];
    const headerItems = [[ 'Item ID', 'Item Name', 'Supplier' ]];

    // Populate data
    const valuesRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          { range: 'Instructions!A1', values: instructions },
          { range: 'Aliases!A1:G1', values: headerAliases },
          { range: 'Items!A1:C1', values: headerItems },
          ...(itemRows.length ? [{ range: `Items!A2:C${itemRows.length + 1}`, values: itemRows }] : []),
          ...(aliasRows.length ? [{ range: `Aliases!A2:G${aliasRows.length + 1}`, values: aliasRows }] : [])
        ]
      })
    });

    if (!valuesRes.ok) {
      const details = await valuesRes.text();
      return Response.json({ error: 'Google API error (values)', details, spreadsheetId, url: openUrl }, { status: 500 });
    }

    // Share with store managers
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    return Response.json({ success: true, spreadsheetId, url: openUrl, title });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});