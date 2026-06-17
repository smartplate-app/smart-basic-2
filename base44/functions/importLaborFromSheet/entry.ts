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
      
      const workerNameIdx = headers.findIndex(h => h.includes('name') || h.includes('שם'));
      const workerPhoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('טלפון') || h.includes('נייד'));
      const workerPosIdx = headers.findIndex(h => h.includes('position') || h.includes('תפקיד') || h.includes('משרה'));
      
      // Additional worker fields
      const workerIdNumIdx = headers.findIndex(h => h.includes('id number') || h.includes('תעודת זהות') || h.includes('ת.ז') || h.includes('מספר זהות'));
      const workerAccountingIdIdx = headers.findIndex(h => h.includes('accounting id') || h.includes('מספר עובד') || h.includes('הנח"ש'));
      const workerEmailIdx = headers.findIndex(h => h.includes('email') || h.includes('אימייל') || h.includes('דוא"ל'));
      const workerBankNameIdx = headers.findIndex(h => h.includes('bank name') || h.includes('שם בנק') || h === 'בנק' || h.includes('שם הבנק'));
      const workerBankBranchIdx = headers.findIndex(h => h.includes('branch') || h.includes('סניף'));
      const workerBankAccountIdx = headers.findIndex(h => h.includes('account') || h.includes('חשבון'));
      const workerStartDateIdx = headers.findIndex(h => h.includes('start date') || h.includes('תחילת עבודה') || h.includes('תאריך התחלה') || h.includes('התחלת עבודה'));
      
      const taxCreditIdx = headers.findIndex(h => h.includes('tax credit') || h.includes('נקודות זיכוי'));
      const managementBonusIdx = headers.findIndex(h => h.includes('management bonus') || h.includes('בונוס'));
      const targetSalaryIdx = headers.findIndex(h => h.includes('target salary') || h.includes('יעד שכר'));
      const employerCostIdx = headers.findIndex(h => h.includes('employer cost') || h.includes('עלות מעביד'));
      const includesOvertimeIdx = headers.findIndex(h => h.includes('overtime') || h.includes('שעות נוספות') || h.includes('גלובלי'));
      const includesTravelIdx = headers.findIndex(h => h.includes('includes travel') || h.includes('כולל נסיעות'));
      const notesIdx = headers.findIndex(h => h.includes('notes') || h.includes('הערות'));
      const tipHourlyOverrideIdx = headers.findIndex(h => h.includes('tip override') || h.includes('השלמה לשעה'));
      const travelTypeIdx = headers.findIndex(h => h.includes('travel type') || h.includes('סוג נסיעות'));

      // Skip schedule tabs outright
      const isScheduleTab = sheetName.includes('סידור') || sheetName.includes('משמרות') || sheetName.includes('schedule') || sheetName.includes('shift');
      if (isScheduleTab) continue;

      // More strict matching to avoid parsing schedule tabs as job positions
      const isWorkersTab = sheetName.toLowerCase().includes('worker') || sheetName.includes('עובדים') || sheetName.includes('צוות') || sheetName.includes('כוח אדם') || sheetName.includes('staff');
      const isPositionsTab = sheetName.toLowerCase().includes('position') || sheetName.includes('תפקיד') || sheetName.includes('משרות') || sheetName.includes('role');
      
      const isWorkers = isWorkersTab || (!isPositionsTab && workerNameIdx >= 0 && (workerPhoneIdx >= 0 || workerPosIdx >= 0));

      const posNameIdx = headers.findIndex(h => h.includes('position name') || h.includes('שם תפקיד') || h === 'תפקיד' || h.includes('position'));
      const posTypeIdx = headers.findIndex(h => h.includes('payment type') || h.includes('סוג תשלום') || h.includes('type') || h.includes('סוג') || h.includes('אופן תשלום'));
      const posAmountIdx = headers.findIndex(h => h.includes('amount') || h.includes('rate') || h.includes('תעריף') || h.includes('סכום'));
      const isPositions = isPositionsTab || (!isWorkersTab && posNameIdx >= 0 && posTypeIdx >= 0 && posAmountIdx >= 0 && !isWorkers);

      // Skip sheets that don't match our criteria at all, or might be schedule sheets
      if (!isWorkers && !isPositions) continue;

      if (isPositions) {
        // Parse Positions
        const sectionIdx = headers.findIndex(h => h.includes('section') || h.includes('department') || h.includes('מחלקה'));
        const tipsIdx = headers.findIndex(h => h.includes('tips') || h.includes('טיפים'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[posNameIdx]) continue;
          
          let pType = normalizeText(row[posTypeIdx]);
          if (pType.includes('month') || pType.includes('חודש')) pType = 'monthly';
          else if (pType.includes('day') || pType.includes('יומי')) pType = 'daily';
          else pType = 'hourly';

          let onTips = false;
          const tipsVal = tipsIdx >= 0 ? normalizeText(row[tipsIdx]) : '';
          if (tipsVal === 'yes' || tipsVal === 'true' || tipsVal === 'כן') onTips = true;

          parsedPositions.push({
            name: row[posNameIdx]?.trim() || '',
            section: sectionIdx >= 0 ? (row[sectionIdx]?.trim() || 'other') : 'other',
            default_payment_type: pType,
            on_tips: onTips,
            default_payment_amount: parseFloat(row[posAmountIdx]) || 0
          });
        }
      } else if (isWorkers) {
        // Parse Workers
        const nameIdx = workerNameIdx;
        const phoneIdx = workerPhoneIdx;
        const pos1Idx = headers.findIndex(h => (h.includes('main') || h.includes('עיקרי') || h.includes('ראשי')) && (h.includes('position') || h.includes('תפקיד')));
        const fallbackPos1Idx = workerPosIdx;
        const actualPos1Idx = pos1Idx >= 0 ? pos1Idx : fallbackPos1Idx;
        const pos2Idx = headers.findIndex(h => h.includes('2nd') || h.includes('שני') || h.includes('תפקיד 2') || h.includes('role 2') || h.includes('נוסף 1') || h.includes('תפקיד משני'));
        const pos3Idx = headers.findIndex(h => h.includes('3rd') || h.includes('שלישי') || h.includes('תפקיד 3') || h.includes('role 3') || h.includes('נוסף 2'));
        const pos4Idx = headers.findIndex(h => h.includes('4th') || h.includes('רביעי') || h.includes('תפקיד 4') || h.includes('role 4') || h.includes('נוסף 3'));
        const pos5Idx = headers.findIndex(h => h.includes('5th') || h.includes('חמישי') || h.includes('תפקיד 5') || h.includes('role 5') || h.includes('נוסף 4'));
        
        // Find specific rate columns for secondary roles if they exist
        // Note: we'll match anything like "2nd rate", "תעריף תפקיד 2", "rate 2"
        const pos2RateIdx = headers.findIndex(h => (h.includes('rate') || h.includes('amount') || h.includes('תעריף')) && (h.includes('2nd') || h.includes('שני') || h.includes('2') || h.includes('משני')));
        const pos3RateIdx = headers.findIndex(h => (h.includes('rate') || h.includes('amount') || h.includes('תעריף')) && (h.includes('3rd') || h.includes('שלישי') || h.includes('3')));
        const pos4RateIdx = headers.findIndex(h => (h.includes('rate') || h.includes('amount') || h.includes('תעריף')) && (h.includes('4th') || h.includes('רביעי') || h.includes('4')));
        const pos5RateIdx = headers.findIndex(h => (h.includes('rate') || h.includes('amount') || h.includes('תעריף')) && (h.includes('5th') || h.includes('חמישי') || h.includes('5')));

        const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('סוג') || h.includes('אופן תשלום') || h.includes('שכר'));
        // Make sure the main amountIdx doesn't grab a secondary rate column by mistake
        // If there's a specific 'main rate' we take it, otherwise the first rate column that isn't for a secondary role
        const amountIdx = headers.findIndex((h, i) => (h.includes('rate') || h.includes('amount') || h.includes('תעריף')) && i !== pos2RateIdx && i !== pos3RateIdx && i !== pos4RateIdx && i !== pos5RateIdx);

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
          if (pos5Idx >= 0 && row[pos5Idx]) otherRoles.push(row[pos5Idx].trim());

          const customRates = {};
          if (pos2Idx >= 0 && row[pos2Idx] && pos2RateIdx >= 0 && row[pos2RateIdx]) customRates[row[pos2Idx].trim().toLowerCase()] = parseFloat(row[pos2RateIdx]) || 0;
          if (pos3Idx >= 0 && row[pos3Idx] && pos3RateIdx >= 0 && row[pos3RateIdx]) customRates[row[pos3Idx].trim().toLowerCase()] = parseFloat(row[pos3RateIdx]) || 0;
          if (pos4Idx >= 0 && row[pos4Idx] && pos4RateIdx >= 0 && row[pos4RateIdx]) customRates[row[pos4Idx].trim().toLowerCase()] = parseFloat(row[pos4RateIdx]) || 0;
          if (pos5Idx >= 0 && row[pos5Idx] && pos5RateIdx >= 0 && row[pos5RateIdx]) customRates[row[pos5Idx].trim().toLowerCase()] = parseFloat(row[pos5RateIdx]) || 0;

          let startDate = '';
          if (workerStartDateIdx >= 0 && row[workerStartDateIdx]) {
            // Very basic date normalization for sheet dates
            const rawDate = row[workerStartDateIdx].trim();
            if (rawDate.match(/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/)) {
              const parts = rawDate.split(/[\/\-.]/);
              // Assuming DD/MM/YYYY
              if (parts[2].length === 2) parts[2] = '20' + parts[2];
              startDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else {
              startDate = rawDate;
            }
          }

          let travelType = 'none';
          if (travelTypeIdx >= 0 && row[travelTypeIdx]) {
            const val = row[travelTypeIdx].trim().toLowerCase();
            if (val.includes('month') || val.includes('חודשי')) travelType = 'monthly';
            else if (val.includes('day') || val.includes('יומי')) travelType = 'daily';
          }

          const parseBool = (idx) => {
            if (idx < 0 || !row[idx]) return undefined;
            const val = row[idx].trim().toLowerCase();
            return val === 'yes' || val === 'כן' || val === 'true' || val === '1' || val === 'v' || val === 'x';
          };

          parsedWorkers.push({
            full_name: row[nameIdx]?.trim() || '',
            phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() : '',
            email: workerEmailIdx >= 0 ? row[workerEmailIdx]?.trim() : '',
            id_number: workerIdNumIdx >= 0 ? row[workerIdNumIdx]?.trim() : '',
            accounting_employee_id: workerAccountingIdIdx >= 0 ? row[workerAccountingIdIdx]?.trim() : '',
            bank_name: workerBankNameIdx >= 0 ? row[workerBankNameIdx]?.trim() : '',
            bank_branch: workerBankBranchIdx >= 0 ? row[workerBankBranchIdx]?.trim() : '',
            bank_account: workerBankAccountIdx >= 0 ? row[workerBankAccountIdx]?.trim() : '',
            start_date: startDate,
            tax_credit_points: taxCreditIdx >= 0 ? parseFloat(row[taxCreditIdx]) : undefined,
            management_bonus: managementBonusIdx >= 0 ? parseFloat(row[managementBonusIdx]) : undefined,
            target_monthly_salary: targetSalaryIdx >= 0 ? parseFloat(row[targetSalaryIdx]) : undefined,
            employer_cost_percentage: employerCostIdx >= 0 ? parseFloat(row[employerCostIdx]) : undefined,
            tip_hourly_rate_override: tipHourlyOverrideIdx >= 0 ? parseFloat(row[tipHourlyOverrideIdx]) : undefined,
            travel_expense_type: travelTypeIdx >= 0 ? travelType : undefined,
            salary_includes_overtime: parseBool(includesOvertimeIdx),
            salary_includes_travel: parseBool(includesTravelIdx),
            notes: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
            job_position_name: actualPos1Idx >= 0 ? row[actualPos1Idx]?.trim() : '',
            secondary_job_position_name: pos2Idx >= 0 ? row[pos2Idx]?.trim() : '',
            other_roles: otherRoles,
            custom_rates: customRates,
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
    const existingPositions = await base44.entities.JobPosition.filter({ created_by: targetEmail }, 'name', 10000);
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
        await base44.entities.JobPosition.update(existing.id, data);
        updatedPos++;
        posMap.set(key, { ...existing, ...data });
      } else {
        const created = await base44.entities.JobPosition.create(data);
        createdPos++;
        posMap.set(key, created);
      }
    });
    
    await Promise.all(posPromises);

    // Pre-pass: Create any missing positions dynamically so we don't skip workers
    const missingPositionsToCreate = new Set();
    
    const addMissingPos = (posName) => {
      const name = posName?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!posMap.has(key)) {
        missingPositionsToCreate.add(name);
      }
    };

    for (const w of parsedWorkers) {
      if (!w.full_name) continue;
      
      const originalPosName = w.job_position_name?.trim() || 'General';
      addMissingPos(originalPosName);
      
      if (w.secondary_job_position_name) addMissingPos(w.secondary_job_position_name);
      if (w.other_roles && w.other_roles.length > 0) {
        for (const role of w.other_roles) {
          addMissingPos(role);
        }
      }
    }

    for (const posName of missingPositionsToCreate) {
      const key = posName.toLowerCase();
      if (!posMap.has(key)) {
        const data = {
          name: posName,
          section: 'other',
          default_payment_type: 'hourly',
          default_payment_amount: 0,
          tips_method: 'general_pool',
          created_by: targetEmail,
          store_owner_email: targetEmail
        };
        const created = await base44.entities.JobPosition.create(data);
        createdPos++;
        posMap.set(key, created);
      }
    }

    // Save workers
    const existingWorkers = await base44.entities.Worker.filter({ created_by: targetEmail }, 'full_name', 10000);
    const workerMap = new Map(existingWorkers.map(w => [w.full_name.trim().toLowerCase(), w]));

    let createdWorkers = 0, updatedWorkers = 0;
    
    const workerPromises = parsedWorkers.map(async (w) => {
      if (!w.full_name) return;
      
      const originalPosName = w.job_position_name?.trim() || 'General';
      const posKey = originalPosName.toLowerCase();
      const pos = posMap.get(posKey);
      if (!pos) return; // Should rarely happen now due to pre-pass
      
      const key = w.full_name.trim().toLowerCase();
      const existing = workerMap.get(key);
      
      const otherRoleIds = [];
      const otherRoleNames = [];
      const positionRates = [];
      
      // Main role rate
      positionRates.push({
        position_id: pos.id,
        position_name: pos.name,
        amount: Number(w.payment_amount) || pos.default_payment_amount || 0,
        payment_type: w.payment_type || pos.default_payment_type || 'hourly'
      });
      
      if (w.secondary_job_position_name) {
        const key = w.secondary_job_position_name.trim().toLowerCase();
        const secPos = posMap.get(key);
        if (secPos) {
          otherRoleIds.push(secPos.id);
          otherRoleNames.push(secPos.name);
          const overrideAmt = w.custom_rates && w.custom_rates[key] ? w.custom_rates[key] : secPos.default_payment_amount;
          positionRates.push({ position_id: secPos.id, position_name: secPos.name, amount: overrideAmt || 0, payment_type: secPos.default_payment_type || 'hourly' });
        }
      }

      if (w.other_roles && w.other_roles.length > 0) {
        for (const roleName of w.other_roles) {
          const key = (roleName || '').trim().toLowerCase();
          const rPos = posMap.get(key);
          if (rPos) {
            otherRoleIds.push(rPos.id);
            otherRoleNames.push(rPos.name);
            const overrideAmt = w.custom_rates && w.custom_rates[key] ? w.custom_rates[key] : rPos.default_payment_amount;
            positionRates.push({ position_id: rPos.id, position_name: rPos.name, amount: overrideAmt || 0, payment_type: rPos.default_payment_type || 'hourly' });
          }
        }
      }
      
      const data = {
        full_name: w.full_name,
        phone: w.phone || '',
        job_position_id: pos.id,
        job_position_name: pos.name,
        secondary_job_position_id: null,
        secondary_job_position_name: null,
        job_position_ids: Array.from(new Set(otherRoleIds)),
        job_position_names: Array.from(new Set(otherRoleNames)),
        payment_type: w.payment_type || 'hourly',
        payment_amount: Number(w.payment_amount) || 0,
        position_rates: positionRates,
        created_by: targetEmail,
        store_owner_email: targetEmail
      };
      
      // Add extra fields only if they have values to avoid overriding existing good data with empty strings
      if (w.email) data.email = w.email;
      if (w.id_number) data.id_number = w.id_number;
      if (w.accounting_employee_id) data.accounting_employee_id = w.accounting_employee_id;
      if (w.bank_name) data.bank_name = w.bank_name;
      if (w.bank_branch) data.bank_branch = w.bank_branch;
      if (w.bank_account) data.bank_account = w.bank_account;
      if (w.start_date) data.start_date = w.start_date;
      if (w.tax_credit_points !== undefined && !isNaN(w.tax_credit_points)) data.tax_credit_points = w.tax_credit_points;
      if (w.management_bonus !== undefined && !isNaN(w.management_bonus)) data.management_bonus = w.management_bonus;
      if (w.target_monthly_salary !== undefined && !isNaN(w.target_monthly_salary)) data.target_monthly_salary = w.target_monthly_salary;
      if (w.employer_cost_percentage !== undefined && !isNaN(w.employer_cost_percentage)) data.employer_cost_percentage = w.employer_cost_percentage;
      if (w.tip_hourly_rate_override !== undefined && !isNaN(w.tip_hourly_rate_override)) data.tip_hourly_rate_override = w.tip_hourly_rate_override;
      if (w.travel_expense_type !== undefined) data.travel_expense_type = w.travel_expense_type;
      if (w.salary_includes_overtime !== undefined) data.salary_includes_overtime = w.salary_includes_overtime;
      if (w.salary_includes_travel !== undefined) data.salary_includes_travel = w.salary_includes_travel;
      if (w.notes) data.notes = w.notes;

      if (existing) {
        // For updates, we don't want to clear out existing secondary positions if the sheet didn't specify them
        if (otherRoleIds.length === 0 && (existing.job_position_ids && existing.job_position_ids.length > 0)) {
           delete data.job_position_ids;
           delete data.job_position_names;
        }
        await base44.entities.Worker.update(existing.id, data);
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