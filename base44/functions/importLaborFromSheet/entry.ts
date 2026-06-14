import { createClientFromRequest } from 'npm:@base44/sdk@0.8.28';

function parseSpreadsheetId(input) {
  if (!input) return null;
  const m = String(input).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (input.length > 30 ? input : null);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { spreadsheetUrl } = await req.json();
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) return Response.json({ error: 'Missing spreadsheetUrl' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!metaRes.ok) return Response.json({ error: 'Failed to read spreadsheet metadata' }, { status: 500 });
    const metaData = await metaRes.json();
    const sheetNames = metaData.sheets.map(s => s.properties.title);

    const parsedPositions = [];
    const parsedWorkers = [];

    const normalizeText = (text) => (text || '').toString().toLowerCase().trim();

    for (const sheetName of sheetNames) {
      const range = `'${sheetName}'!A1:Z1000`;
      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!getRes.ok) continue;
      
      const data = await getRes.json();
      const rows = data.values || [];
      if (rows.length < 2) continue;

      const headers = rows[0].map(normalizeText);
      const isPositions = headers.some(h => h.includes('position name') || h.includes('שם תפקיד'));
      const isWorkers = headers.some(h => h.includes('full name') || h.includes('שם מלא') || h.includes('שם'));

      if (isPositions && !isWorkers) {
        // Parse Positions
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('שם'));
        const sectionIdx = headers.findIndex(h => h.includes('section') || h.includes('department') || h.includes('מחלקה'));
        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('סוג'));
        const tipsIdx = headers.findIndex(h => h.includes('tips') || h.includes('טיפים'));
        const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('rate') || h.includes('תעריף'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nameIdx]) continue;
          
          let pType = normalizeText(row[typeIdx]);
          if (pType.includes('month') || pType.includes('חודש')) pType = 'monthly';
          else if (pType.includes('day') || pType.includes('יומי')) pType = 'daily';
          else pType = 'hourly';

          let onTips = false;
          const tipsVal = normalizeText(row[tipsIdx]);
          if (tipsVal === 'yes' || tipsVal === 'true' || tipsVal === 'כן') onTips = true;

          parsedPositions.push({
            name: row[nameIdx]?.trim() || '',
            section: row[sectionIdx]?.trim() || 'other',
            default_payment_type: pType,
            on_tips: onTips,
            default_payment_amount: parseFloat(row[amountIdx]) || 0
          });
        }
      } else if (isWorkers) {
        // Parse Workers
        const nameIdx = headers.findIndex(h => h.includes('full name') || h.includes('שם מלא') || h.includes('שם'));
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('טלפון'));
        const pos1Idx = headers.findIndex(h => h.includes('main') && (h.includes('position') || h.includes('תפקיד')));
        const pos2Idx = headers.findIndex(h => h.includes('2nd') || h.includes('שני'));
        const pos3Idx = headers.findIndex(h => h.includes('3rd') || h.includes('שלישי'));
        const pos4Idx = headers.findIndex(h => h.includes('4th') || h.includes('רביעי'));
        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('סוג'));
        const amountIdx = headers.findIndex(h => h.includes('rate') || h.includes('amount') || h.includes('תעריף'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nameIdx]) continue;

          let pType = normalizeText(row[typeIdx]);
          if (pType.includes('month') || pType.includes('חודש')) pType = 'monthly';
          else if (pType.includes('day') || pType.includes('יומי')) pType = 'daily';
          else pType = 'hourly';

          const otherRoles = [];
          if (pos3Idx >= 0 && row[pos3Idx]) otherRoles.push(row[pos3Idx].trim());
          if (pos4Idx >= 0 && row[pos4Idx]) otherRoles.push(row[pos4Idx].trim());

          parsedWorkers.push({
            full_name: row[nameIdx]?.trim() || '',
            phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() : '',
            job_position_name: pos1Idx >= 0 ? row[pos1Idx]?.trim() : '',
            secondary_job_position_name: pos2Idx >= 0 ? row[pos2Idx]?.trim() : '',
            other_roles: otherRoles,
            payment_type: pType,
            payment_amount: parseFloat(row[amountIdx]) || 0
          });
        }
      }
    }

    // Use specific store creator context
    let targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
    if (!user.store_user_owner_email) {
      try {
        const recs = await base44.asServiceRole.entities.StoreUser.filter({ user_email: user.email, is_active: true });
        if (recs.length > 0) targetEmail = recs[0].owner_email;
      } catch(e){}
    }

    // Save positions
    const existingPositions = await base44.asServiceRole.entities.JobPosition.filter({ created_by: targetEmail }, 'name', 10000);
    const posMap = new Map(existingPositions.map(p => [p.name.trim().toLowerCase(), p]));

    let createdPos = 0, updatedPos = 0;
    
    const posPromises = parsedPositions.map(async (p) => {
      if (!p.name) return;
      const key = p.name.trim().toLowerCase();
      const existing = posMap.get(key);
      const data = {
        name: p.name,
        section: p.section || 'other',
        default_payment_type: p.default_payment_type || 'hourly',
        default_payment_amount: Number(p.default_payment_amount) || 0,
        tips_method: p.on_tips ? 'general_pool' : 'excluded',
        created_by: targetEmail,
        store_owner_email: targetEmail
      };
      if (existing) {
        await base44.asServiceRole.entities.JobPosition.update(existing.id, data);
        updatedPos++;
        posMap.set(key, { ...existing, ...data });
      } else {
        const created = await base44.asServiceRole.entities.JobPosition.create(data);
        createdPos++;
        posMap.set(key, created);
      }
    });
    
    await Promise.all(posPromises);

    // Save workers
    const existingWorkers = await base44.asServiceRole.entities.Worker.filter({ created_by: targetEmail }, 'full_name', 10000);
    const workerMap = new Map(existingWorkers.map(w => [w.full_name.trim().toLowerCase(), w]));

    let createdWorkers = 0, updatedWorkers = 0;
    
    const workerPromises = parsedWorkers.map(async (w) => {
      if (!w.full_name) return;
      const posKey = (w.job_position_name || '').trim().toLowerCase();
      const pos = posMap.get(posKey);
      if (!pos) return; // Need valid position
      
      const key = w.full_name.trim().toLowerCase();
      const existing = workerMap.get(key);
      
      let secondaryPosId = null;
      let secondaryPosName = null;
      if (w.secondary_job_position_name) {
        const secPos = posMap.get(w.secondary_job_position_name.trim().toLowerCase());
        if (secPos) {
          secondaryPosId = secPos.id;
          secondaryPosName = secPos.name;
        }
      }
      
      const otherRoleIds = [];
      const otherRoleNames = [];
      if (w.other_roles && w.other_roles.length > 0) {
        for (const roleName of w.other_roles) {
          const rPos = posMap.get((roleName || '').trim().toLowerCase());
          if (rPos) {
            otherRoleIds.push(rPos.id);
            otherRoleNames.push(rPos.name);
          }
        }
      }
      
      const data = {
        full_name: w.full_name,
        phone: w.phone || '',
        job_position_id: pos.id,
        job_position_name: pos.name,
        secondary_job_position_id: secondaryPosId,
        secondary_job_position_name: secondaryPosName,
        job_position_ids: otherRoleIds,
        job_position_names: otherRoleNames,
        payment_type: w.payment_type || 'hourly',
        payment_amount: Number(w.payment_amount) || 0,
        created_by: targetEmail,
        store_owner_email: targetEmail
      };

      if (existing) {
        await base44.asServiceRole.entities.Worker.update(existing.id, data);
        updatedWorkers++;
      } else {
        await base44.asServiceRole.entities.Worker.create(data);
        createdWorkers++;
      }
    });
    
    await Promise.all(workerPromises);

    return Response.json({
      success: true,
      created_positions: createdPos,
      updated_positions: updatedPos,
      created_workers: createdWorkers,
      updated_workers: updatedWorkers
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});