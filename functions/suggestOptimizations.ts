import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function toMonthStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const focus = body.focus || 'all'; // 'orders' | 'schedules' | 'all'
    const month = body.month || toMonthStr(new Date());

    // Determine working/owner email (for branch/store users)
    let workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;
    let ownerEmail = user.store_user_owner_email || null;
    if (!ownerEmail) {
      try {
        const links = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
        if (links.length > 0) ownerEmail = links[0].owner_email || null;
      } catch (_) {}
    }
    const targetEmail = ownerEmail || workingEmail;

    // Load data
    const [orders, suppliers, schedules, dashboards] = await Promise.all([
      base44.entities.Order.filter({ created_by: targetEmail }),
      base44.entities.Supplier.filter({ created_by: targetEmail }),
      base44.entities.WeeklySchedule.filter({ created_by: targetEmail }),
      base44.entities.MonthlyDashboardData.filter({ created_by: targetEmail, month })
    ]);

    // Aggregate orders by supplier
    const bySupplier = {};
    for (const o of (orders || [])) {
      const sname = o.supplier_name || 'Unknown';
      bySupplier[sname] = bySupplier[sname] || { name: sname, orders: 0, total: 0 };
      bySupplier[sname].orders += 1;
      bySupplier[sname].total += (o.total_cost || 0);
    }
    const suppliersRanked = Object.values(bySupplier).sort((a,b) => b.total - a.total);

    // Aggregate schedule/labor
    const monthlyWeekStarts = (schedules || []).filter(s => (s.week_start_date || '').startsWith(month));
    const laborTotals = monthlyWeekStarts.reduce((acc, s) => acc + (s.total_cost || 0), 0);
    const predictedSalesIncl = dashboards?.[0]?.predicted_sales || 0;
    const predictedWeeklyIncl = predictedSalesIncl > 0 ? predictedSalesIncl / 4.2 : 0;
    const predictedExcl = predictedWeeklyIncl / 1.17; // weekly base, but we will compare roughly
    const laborPctApprox = predictedExcl > 0 ? ((monthlyWeekStarts.reduce((a,s) => a + (s.total_cost||0),0) / predictedExcl) * 100) : 0;

    // Prepare structured summary for the LLM
    const summary = {
      month,
      orders_stats: {
        suppliers_ranked: suppliersRanked.slice(0, 10),
        total_orders: (orders || []).length,
        total_suppliers: (suppliers || []).length
      },
      labor_stats: {
        weeks_in_month: monthlyWeekStarts.length,
        labor_total_cost_sum: laborTotals,
        predicted_weekly_sales_ex_vat: Math.round(predictedExcl),
        approx_labor_percent_vs_predicted: Number(laborPctApprox.toFixed(1))
      }
    };

    const prompt = `You are an operations optimizer for restaurants.
Analyze the JSON summary and propose practical improvements for orders (e.g., preferred suppliers, reorder patterns, bundles) and for schedules (e.g., shift count/length adjustments vs predicted sales).
Return bilingual suggestions (he/en) and structured action_items.
Keep each suggestion concise (<= 2 sentences).`;

    const schema = {
      type: 'object',
      properties: {
        he: { type: 'array', items: { type: 'string' } },
        en: { type: 'array', items: { type: 'string' } },
        action_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              area: { type: 'string' }, // 'orders' | 'schedules'
              priority: { type: 'string' }, // 'low' | 'medium' | 'high'
              description_he: { type: 'string' },
              description_en: { type: 'string' }
            },
            required: ['area','priority','description_he','description_en']
          }
        },
        ideal_suppliers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              score: { type: 'number' },
              rationale_he: { type: 'string' },
              rationale_en: { type: 'string' }
            },
            required: ['name','score']
          }
        }
      },
      required: ['he','en']
    };

    const llmInput = JSON.stringify(summary);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${prompt}\n\nSUMMARY_JSON:\n${llmInput}`,
      response_json_schema: schema
    });

    return Response.json({ success: true, focus, month, summary, suggestions: result });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});