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

    let allRowsData = "";
    for (const sheetName of sheetNames) {
      const range = `'${sheetName}'!A1:Z1000`;
      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!getRes.ok) continue;
      
      const data = await getRes.json();
      const rows = data.values || [];
      if (rows.length < 2) continue;

      allRowsData += `\n\n--- Sheet: ${sheetName} ---\n` + JSON.stringify(rows.slice(0, 1000));
    }

    if (!allRowsData) return Response.json({ error: 'No data found in spreadsheet' }, { status: 400 });

    const prompt = `You are parsing a restaurant Google Sheets file into structured JSON.
Tabs: "Workers", "Job Positions" (names may vary).
Rules:
1. Extract Job Positions: name, section (kitchen/service/bar/management/cleaning/other), default_payment_type (hourly/monthly/daily), on_tips (boolean), default_payment_amount.
2. Extract Workers: full_name, phone, job_position_name, secondary_job_position_name (2nd role), other_roles (array of strings, e.g. 3rd, 4th roles), payment_type (hourly/monthly/daily), payment_amount.
If payment_type is missing or invalid, default to 'hourly'. Section default 'other'. 
Data:
${allRowsData}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          positions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                section: { type: 'string', enum: ["kitchen", "service", "bar", "management", "cleaning", "other"] },
                default_payment_type: { type: 'string', enum: ["monthly", "daily", "hourly"] },
                on_tips: { type: 'boolean' },
                default_payment_amount: { type: 'number' }
              },
              required: ['name', 'default_payment_type', 'default_payment_amount']
            }
          },
          workers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                full_name: { type: 'string' },
                phone: { type: 'string' },
                job_position_name: { type: 'string' },
                secondary_job_position_name: { type: 'string' },
                other_roles: { type: 'array', items: { type: 'string' } },
                payment_type: { type: 'string', enum: ["monthly", "daily", "hourly"] },
                payment_amount: { type: 'number' }
              },
              required: ['full_name', 'job_position_name', 'payment_type', 'payment_amount']
            }
          }
        }
      }
    });

    const parsedPositions = response.positions || [];
    const parsedWorkers = response.workers || [];

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
        const created = await base44.entities.JobPosition.create(data);
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
        await base44.entities.Worker.create(data);
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