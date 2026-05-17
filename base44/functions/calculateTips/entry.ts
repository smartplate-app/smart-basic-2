import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Payload schema (from frontend):
 * {
 *   date?: string,
 *   shift_type?: 'morning'|'evening'|'night',
 *   cash_tips: number,
 *   credit_tips: number,
 *   policy_id?: string,
 *   workers: Array<{
 *     worker_id: string,
 *     hours: number,
 *     job_position_id?: string
 *   }>
 * }
 *
 * Algorithm (agreed):
 * 1) gross = cash + credit
 * 2) Pay fixed tip-per-hour workers first (from cash, then credit)
 * 3) Compute percentage allocations on gross; cap proportionally if remaining pool is insufficient
 * 4) Distribute percentage buckets to workers in those positions by hours
 * 5) Distribute residual pool among remaining eligible workers (not in percentage-target positions and with no tip-per-hour), by hours
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const cashTips = Number(payload.cash_tips || 0);
    const creditTips = Number(payload.credit_tips || 0);
    const workersInput = Array.isArray(payload.workers) ? payload.workers : [];
    const policyId = payload.policy_id || null;

    if (cashTips < 0 || creditTips < 0) {
      return Response.json({ error: 'cash_tips and credit_tips must be >= 0' }, { status: 400 });
    }

    const gross = cashTips + creditTips;

    // Load Workers
    const workerIds = workersInput.map(w => w.worker_id).filter(Boolean);
    const workerRecords = await Promise.all(workerIds.map(async (id) => {
      try {
        const list = await base44.entities.Worker.filter({ id });
        return list && list[0] ? list[0] : null;
      } catch (e) {
        return null;
      }
    }));
    const workersById = new Map();
    workerRecords.forEach((w, idx) => { if (w) workersById.set(w.id, w); });

    // Collect JobPosition IDs
    const positionIds = new Set();
    workersInput.forEach(w => { if (w.job_position_id) positionIds.add(w.job_position_id); });
    workerRecords.forEach(w => { if (w?.job_position_id) positionIds.add(w.job_position_id); });

    // Load JobPositions
    const jobPositions = await Promise.all([...positionIds].map(async (id) => {
      const list = await base44.entities.JobPosition.filter({ id });
      return list && list[0] ? list[0] : null;
    }));
    const positionsById = new Map();
    jobPositions.forEach(p => { if (p) positionsById.set(p.id, p); });

    // Load TipPolicy (latest by effective_date if not given)
    let policy = null;
    if (policyId) {
      const list = await base44.entities.TipPolicy.filter({ id: policyId });
      policy = list && list[0] ? list[0] : null;
    } else {
      const list = await base44.entities.TipPolicy.list();
      if (Array.isArray(list) && list.length) {
        policy = [...list].sort((a, b) => {
          const da = a.effective_date ? new Date(a.effective_date).getTime() : 0;
          const db = b.effective_date ? new Date(b.effective_date).getTime() : 0;
          return db - da;
        })[0];
      }
    }
    const allocations = Array.isArray(policy?.percentage_allocations) ? policy.percentage_allocations : [];

    // Normalize workers input and enrich with data
    const normalizedWorkers = workersInput.map(w => {
      const rec = workersById.get(w.worker_id) || {};
      const explicitPosId = w.job_position_id || rec.job_position_id || null;
      const pos = explicitPosId ? positionsById.get(explicitPosId) : null;
      const overrideRate = Number(rec.tip_hourly_rate_override || 0);
      const positionRate = Number(pos?.tip_hourly_rate || 0);
      const hourlyRate = overrideRate > 0 ? overrideRate : positionRate;
      const tipsMethod = pos?.tips_method || 'general_pool';
      return {
        worker_id: w.worker_id,
        worker_name: rec.full_name || '',
        job_position_id: explicitPosId,
        job_position_name: rec.job_position_name || pos?.name || '',
        tips_method: tipsMethod,
        hours: Number(w.hours || 0),
        hourly_rate: Number(hourlyRate || 0)
      };
    });

    // Pools
    let cashPool = cashTips;
    let creditPool = creditTips;

    const perWorker = new Map();
    const ensure = (wid) => {
      if (!perWorker.has(wid)) {
        perWorker.set(wid, {
          worker_id: wid,
          worker_name: normalizedWorkers.find(x => x.worker_id === wid)?.worker_name || '',
          job_position_id: normalizedWorkers.find(x => x.worker_id === wid)?.job_position_id || null,
          job_position_name: normalizedWorkers.find(x => x.worker_id === wid)?.job_position_name || '',
          breakdown: {
            hourly_fixed: 0,
            hourly_fixed_cash: 0,
            hourly_fixed_credit: 0,
            percent_share: 0,
            percent_cash: 0,
            percent_credit: 0,
            residual_share: 0,
            residual_cash: 0,
            residual_credit: 0
          }
        });
      }
      return perWorker.get(wid);
    };

    // 1) Pay fixed tip-per-hour first
    const hourlyWorkers = normalizedWorkers.filter(w => w.tips_method === 'fixed_hourly' && w.hourly_rate > 0 && w.hours > 0);
    for (const w of hourlyWorkers) {
      const due = w.hours * w.hourly_rate;
      let fromCash = Math.min(cashPool, due);
      cashPool -= fromCash;
      let remaining = due - fromCash;
      let fromCredit = Math.min(creditPool, remaining);
      creditPool -= fromCredit;
      const paid = fromCash + fromCredit; // if pools insufficient, we cap

      const row = ensure(w.worker_id);
      row.breakdown.hourly_fixed += paid;
      row.breakdown.hourly_fixed_cash += fromCash;
      row.breakdown.hourly_fixed_credit += fromCredit;
    }

    // 2) Percentage allocations on GROSS
    const pctBuckets = allocations
      .filter(a => a && typeof a.percentage === 'number' && a.percentage > 0)
      .map(a => ({
        job_position_id: a.job_position_id || null,
        job_position_name: a.job_position_name || '',
        percentage: a.percentage,
        amount: (a.percentage / 100) * gross
      }));

    // If not enough funds after hourly to cover all percentage buckets, cap proportionally
    const remainingTotal = cashPool + creditPool;
    const totalPct = pctBuckets.reduce((s, b) => s + b.amount, 0);
    let pctScale = 1;
    if (totalPct > remainingTotal && totalPct > 0) {
      pctScale = remainingTotal / totalPct;
    }

    // Distribute percentage buckets: deduct from pools pro-rata, then split to workers in that position by hours
    for (const b of pctBuckets) {
      const bucketAmount = b.amount * pctScale;
      const poolTotal = cashPool + creditPool;
      let useCash = poolTotal > 0 ? bucketAmount * (cashPool / poolTotal) : 0;
      let useCredit = bucketAmount - useCash;

      // Safety caps
      useCash = Math.min(useCash, cashPool);
      cashPool -= useCash;
      useCredit = Math.min(useCredit, creditPool);
      creditPool -= useCredit;
      const used = useCash + useCredit;

      // Eligible workers: same job position as bucket
      const group = normalizedWorkers.filter(w => w.job_position_id && w.job_position_id === b.job_position_id && w.hours > 0 && w.tips_method !== 'fixed_hourly');
      const totalHours = group.reduce((s, w) => s + w.hours, 0);
      if (group.length === 0 || totalHours === 0) {
        // No eligible workers; return funds to residual pool
        cashPool += useCash;
        creditPool += useCredit;
        continue;
      }

      for (const w of group) {
        const share = used * (w.hours / totalHours);
        const cashShare = used > 0 ? share * (useCash / used) : 0;
        const creditShare = share - cashShare;
        const row = ensure(w.worker_id);
        row.breakdown.percent_share += share;
        row.breakdown.percent_cash += cashShare;
        row.breakdown.percent_credit += creditShare;
      }
    }

    // 3) Residual distribution among remaining eligible workers
    const pctPositionIds = new Set(pctBuckets.map(b => b.job_position_id).filter(Boolean));
    const residualGroup = normalizedWorkers.filter(w => w.hours > 0 && w.tips_method !== 'fixed_hourly' && (!w.job_position_id || !pctPositionIds.has(w.job_position_id)));
    const residualTotal = cashPool + creditPool;
    const residualHours = residualGroup.reduce((s, w) => s + w.hours, 0);

    if (residualGroup.length > 0 && residualHours > 0 && residualTotal > 0) {
      for (const w of residualGroup) {
        const share = residualTotal * (w.hours / residualHours);
        const cashShare = residualTotal > 0 ? share * (cashPool / residualTotal) : 0;
        const creditShare = share - cashShare;
        const row = ensure(w.worker_id);
        row.breakdown.residual_share += share;
        row.breakdown.residual_cash += cashShare;
        row.breakdown.residual_credit += creditShare;
      }
      // All residual distributed
      cashPool = 0;
      creditPool = 0;
    }

    // Finalize output
    const results = normalizedWorkers.map(w => {
      const r = ensure(w.worker_id);
      const total = r.breakdown.hourly_fixed + r.breakdown.percent_share + r.breakdown.residual_share;
      return {
        ...r,
        total,
        total_cash: r.breakdown.hourly_fixed_cash + r.breakdown.percent_cash + r.breakdown.residual_cash,
        total_credit: r.breakdown.hourly_fixed_credit + r.breakdown.percent_credit + r.breakdown.residual_credit
      };
    });

    const response = {
      inputs: {
        cash_tips: cashTips,
        credit_tips: creditTips,
        gross,
        policy_id: policy?.id || null,
        policy_name: policy?.policy_name || null
      },
      pools_after: { cash_remaining: cashPool, credit_remaining: creditPool },
      results,
      summary: {
        hourly_paid: results.reduce((s, r) => s + r.breakdown.hourly_fixed, 0),
        percent_paid: results.reduce((s, r) => s + r.breakdown.percent_share, 0),
        residual_paid: results.reduce((s, r) => s + r.breakdown.residual_share, 0),
        distributed_total: results.reduce((s, r) => s + r.total, 0)
      }
    };

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});