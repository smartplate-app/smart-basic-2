import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let payload = {};
    try { payload = await req.json(); } catch { /* no body */ }
    const count = Math.max(1, Math.min(Number(payload?.count) || 12, 100));
    const ownerEmail = (payload?.ownerEmail || user.email).trim();

    // Get or create a supplier under the current user (visible in their account)
    let suppliers = await base44.entities.Supplier.filter({ created_by: user.email }, 'name');
    let supplier = suppliers[0];
    if (!supplier) {
      supplier = await base44.entities.Supplier.create({ name: 'Test Supplier' });
    }

    const units = ['unit', 'kg', 'liter', 'case'];

    const created = [];
    for (let i = 0; i < count; i++) {
      const idx = Date.now() % 100000 + i;
      const data = {
        name: `Test Item ${idx}`,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        unit: rand(units),
        units_per_package: 1,
        catalog_number: `TST-${1000 + i}`,
        price: Number((Math.random() * 40 + 5).toFixed(2)),
        discount: [0, 0, 5, 10][Math.floor(Math.random() * 4)],
        minimum_stock: Math.floor(Math.random() * 10),
        description: 'Seeded for header scroll testing',
        store_owner_email: ownerEmail
      };
      const it = await base44.entities.Item.create(data);
      created.push({ id: it.id, name: it.name });
    }

    return Response.json({ success: true, created_count: created.length, created, supplier_id: supplier.id, supplier_name: supplier.name, ownerEmail });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
});