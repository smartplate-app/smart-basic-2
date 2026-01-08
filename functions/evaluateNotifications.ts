import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatCurrencyILS(v) {
  try { return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(v || 0); } catch { return String(v || 0); }
}

function startOfMonthStr(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return d.toISOString().slice(0,10);
}
function endOfMonthStr(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return d.toISOString().slice(0,10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const trigger = body?.trigger || 'manual'; // 'manual' | 'scheduled_daily'

    // Evaluate only relevant frequencies
    const today = new Date();
    const day = today.getDay(); // 0=Sun
    const shouldRunWeekly = trigger === 'scheduled_daily' ? (day === 0 || day === 1) : true;

    // Determine working email (owner context if store user)
    let workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;
    try {
      const storeUsers = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
      if (storeUsers?.length > 0) workingEmail = storeUsers[0].owner_email || workingEmail;
    } catch {}

    const rules = await base44.entities.NotificationRule.filter({ created_by: workingEmail });
    const activeRules = (rules || []).filter(r => r.is_active !== false).filter(r => {
      if (body?.only_rule_ids && Array.isArray(body.only_rule_ids)) return body.only_rule_ids.includes(r.id);
      if (trigger === 'scheduled_daily') return r.frequency === 'daily' || (shouldRunWeekly && r.frequency === 'weekly');
      return true; // manual runs all
    });

    const created = [];

    // Load data once for performance
    // Latest weekly schedule
    let latestSchedule = null;
    try {
      const schedules = await base44.entities.WeeklySchedule.filter({ created_by: workingEmail }, '-updated_date');
      latestSchedule = schedules?.[0] || null;
    } catch {}

    // Orders of this month
    let allOrders = [];
    try {
      allOrders = await base44.entities.Order.filter({ created_by: workingEmail }, '-created_date');
    } catch {}

    // Suppliers
    let suppliers = [];
    try { suppliers = await base44.entities.Supplier.filter({ created_by: workingEmail }, 'name'); } catch {}

    // Dashboard goals
    let monthData = null;
    try {
      const monthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
      const dd = await base44.entities.MonthlyDashboardData.filter({ created_by: workingEmail, month: monthStr });
      monthData = dd?.[0] || null;
    } catch {}

    const pushNotification = async ({ rule, severity = 'warning', message, link_url, meta }) => {
      const recips = (rule.recipients && Array.isArray(rule.recipients) && rule.recipients.length > 0) ? rule.recipients : [workingEmail];
      // In-app records
      if (rule.channels?.includes('in_app')) {
        for (const to of recips) {
          const rec = await base44.entities.Notification.create({
            user_email: to,
            rule_id: rule.id,
            rule_name: rule.name,
            rule_type: rule.rule_type,
            channel: 'in_app',
            severity,
            message,
            link_url: link_url || '',
            meta: meta || {}
          });
          created.push(rec);
        }
      }
      // Email
      if (rule.channels?.includes('email')) {
        for (const to of recips) {
          try {
            await base44.integrations.Core.SendEmail({
              to,
              subject: `התראה: ${rule.name}`,
              body: message + (link_url ? `\n\nקישור: ${link_url}` : '')
            });
          } catch (_) {}
        }
      }
      // Mark last triggered
      try { await base44.entities.NotificationRule.update(rule.id, { last_triggered_at: new Date().toISOString() }); } catch {}
    };

    for (const rule of activeRules) {
      const type = rule.rule_type;
      const c = rule.criteria || {};

      if (type === 'labor_cost_over_goal') {
        // Compare latest schedule labor % vs threshold or dashboard labor goal percent
        const threshold = Number(c.threshold_percent || monthData?.labor_goal_percent || 30);
        const laborPct = Number(latestSchedule?.labor_cost_percentage || 0);
        if (latestSchedule && laborPct > threshold) {
          await pushNotification({
            rule,
            severity: laborPct > threshold + 5 ? 'critical' : 'warning',
            message: `עלות עבודה שבועית ${laborPct.toFixed(1)}% חרגה מהסף ${threshold}% לשבוע שמתחיל ${latestSchedule.week_start_date}.` ,
            link_url: '/#/pages/LaborCost'
          });
        }
      } else if (type === 'pending_orders') {
        const hours = Number(c.max_hours_pending || 24);
        const cutoff = Date.now() - hours * 3600 * 1000;
        const affected = (allOrders || []).filter(o => ['draft','sent'].includes(o.status || 'draft')).filter(o => {
          const d = new Date(o.created_date || o.updated_date || Date.now()).getTime();
          return d < cutoff;
        });
        if (affected.length > 0) {
          await pushNotification({
            rule,
            severity: affected.length > 5 ? 'critical' : 'warning',
            message: `יש ${affected.length} הזמנות ממתינות מעל ${hours} שעות.`,
            link_url: '/#/pages/Orders',
            meta: { count: affected.length }
          });
        }
      } else if (type === 'supplier_low_orders') {
        const days = Number(c.days_without_order || 14);
        const cutoff = Date.now() - days * 24 * 3600 * 1000;
        // Map orders by supplier within window
        const recentOrders = (allOrders || []).filter(o => new Date(o.created_date || o.updated_date || Date.now()).getTime() >= cutoff);
        const orderedSupplierIds = new Set(recentOrders.map(o => o.supplier_id).filter(Boolean));
        const inactive = (suppliers || []).filter(s => !orderedSupplierIds.has(s.id));
        if (inactive.length > 0) {
          const names = inactive.slice(0,5).map(s => s.name).join(', ');
          await pushNotification({
            rule,
            severity: 'info',
            message: `ספקים ללא הזמנות ב-${days} ימים: ${names}${inactive.length>5?` ועוד ${inactive.length-5}...`:''}`,
            link_url: '/#/pages/Orders',
            meta: { count: inactive.length }
          });
        }
      }
    }

    return Response.json({ success: true, created: created.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});