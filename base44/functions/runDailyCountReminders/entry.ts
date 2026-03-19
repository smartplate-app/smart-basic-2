import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getNowInTZ(tz) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const iso = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: parts.hour, minute: parts.minute, iso };
}

function minutesDiff(hhmm, hour, minute) {
  const [h, m] = (hhmm || '16:00').split(':').map(n => parseInt(n, 10));
  return Math.abs((h*60 + m) - (parseInt(hour,10)*60 + parseInt(minute,10)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Run as service role to scan all warehouses
    const warehouses = await base44.asServiceRole.entities.Warehouse.list();
    const now = getNowInTZ('Asia/Jerusalem');

    let sent = 0;
    for (const w of warehouses) {
      if (!w.daily_count_enabled || !w.daily_count_time) continue;
      // Only once per day
      if (w.last_daily_count_reminder_date === now.date) continue;
      const diff = minutesDiff(w.daily_count_time, now.hour, now.minute);
      if (diff <= 5) {
        const to = w.created_by || null;
        if (to) {
          const link = `${new URL(req.url).origin}/pages/MonthlyCount`;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to,
            subject: `Daily Count Reminder - ${w.name}`,
            body: `Hi,\n\nIt's time to do today's daily count for warehouse: ${w.name}.\n\nOpen Daily Count: ${link}\n\nItems configured: ${(w.daily_count_items || []).length}.\n\n— SmartPlate Simple`
          });
        }
        await base44.asServiceRole.entities.Warehouse.update(w.id, {
          last_daily_count_reminder_date: now.date
        });
        sent += 1;
      }
    }

    return Response.json({ success: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});