import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function weekNumberFrom(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  // Simple week number (Sun-based): week 1 starts on Jan 1
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = (d - start) / 86400000; // days
  return String(Math.floor((diff + start.getDay()) / 7) + 1);
}

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const include = body.include || { suppliers: true, items: true, orders: true, schedules: true };
    const counts = body.counts || { suppliers: 1, itemsPerSupplier: 3, orders: 2 };

    const today = new Date();
    const weekStart = (() => {
      const d = new Date();
      const day = d.getDay(); // 0=Sun
      const diff = day; // start Sunday
      const start = new Date(d);
      start.setDate(d.getDate() - diff);
      return `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
    })();

    // Ensure at least one supplier if orders requested
    let suppliers = [];
    if (include.suppliers) {
      const toCreate = Array.from({ length: counts.suppliers }).map((_, i) => ({
        name: `Sample Supplier ${i+1}`,
        phone: '050-1234567',
        email: `supplier${i+1}@example.com`,
        contact_person: 'דן/יובל',
        supplier_type: 'simple'
      }));
      suppliers = await base44.entities.Supplier.bulkCreate(toCreate);
    } else {
      suppliers = await base44.entities.Supplier.filter({});
      if (suppliers.length === 0) {
        suppliers = await base44.entities.Supplier.bulkCreate([{ name: 'Sample Supplier', phone: '050-1234567', email: 'supplier@example.com', contact_person: 'Team', supplier_type: 'simple' }]);
      }
    }

    let items = [];
    if (include.items) {
      const itemPayload = [];
      suppliers.forEach((s, si) => {
        for (let i = 1; i <= counts.itemsPerSupplier; i++) {
          itemPayload.push({
            name: `Item ${si+1}-${i}`,
            supplier_id: s.id,
            supplier_name: s.name,
            unit: 'unit',
            price: 25 + i * 5,
            discount: 0,
            units_per_package: 1
          });
        }
      });
      items = await base44.entities.Item.bulkCreate(itemPayload);
    } else {
      items = await base44.entities.Item.filter({});
    }

    let orders = [];
    if (include.orders) {
      for (let i = 0; i < counts.orders; i++) {
        const s = suppliers[i % suppliers.length];
        const picked = items.filter(it => it.supplier_id === s.id).slice(0, 2);
        const orderItems = picked.map(it => ({
          item_id: it.id,
          item_name: it.name,
          quantity: 3,
          unit: it.unit,
          price: it.price,
          total: 3 * (it.price || 0)
        }));
        const total_cost = orderItems.reduce((sum, it) => sum + (it.total || 0), 0);
        const o = await base44.entities.Order.create({
          supplier_id: s.id,
          supplier_name: s.name,
          supplier_phone: s.phone || '050-1234567',
          supplier_email: s.email || 'supplier@example.com',
          restaurant_name: user.business_name || 'My Restaurant',
          restaurant_address: user.business_address || 'Tel Aviv',
          status: 'draft',
          items: orderItems,
          total_cost
        });
        orders.push(o);
      }
    }

    let schedule = null;
    if (include.schedules) {
      const shifts = [
        { day: 'sunday', date: weekStart, worker_name: 'Alice', start_time: '09:00', end_time: '17:00', hours_worked: 8, overtime_rate: 'regular', payment_for_shift: 400 },
        { day: 'monday', date: weekStart, worker_name: 'Ben', start_time: '10:00', end_time: '18:00', hours_worked: 8, overtime_rate: 'regular', payment_for_shift: 380 }
      ];
      const total_cost = shifts.reduce((s, sh) => s + (sh.payment_for_shift || 0), 0);
      schedule = await base44.entities.WeeklySchedule.create({
        week_start_date: weekStart,
        week_number: weekNumberFrom(weekStart),
        year: String(new Date(weekStart).getFullYear()),
        predicted_weekly_sales: 25000,
        shifts,
        total_hours: shifts.reduce((s, sh) => s + (sh.hours_worked || 0), 0),
        total_cost,
        labor_cost_percentage: 0,
        status: 'draft'
      });
    }

    return Response.json({
      success: true,
      created: {
        suppliers: suppliers.length,
        items: items.length,
        orders: orders.length,
        schedule: schedule ? 1 : 0
      },
      sample_ids: {
        supplier_ids: suppliers.map(s => s.id),
        item_ids: items.map(i => i.id),
        order_ids: orders.map(o => o.id),
        schedule_id: schedule?.id || null
      }
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});