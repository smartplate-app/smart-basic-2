import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure there is at least one supplier
    let suppliers = await base44.entities.Supplier.filter({ created_by: user.email }, 'name');
    let supplier = suppliers[0];
    if (!supplier) {
      supplier = await base44.entities.Supplier.create({ name: 'Test Supplier' });
    }

    const units = ['unit', 'kg', 'liter', 'case'];

    const makeItem = (idx) => ({
      name: `Test Item ${idx}`,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      unit: randomFrom(units),
      units_per_package: 1,
      catalog_number: `TST-${1000 + idx}`,
      price: Number((Math.random() * 40 + 5).toFixed(2)),
      discount: [0, 0, 5, 10][Math.floor(Math.random() * 4)],
      minimum_stock: Math.floor(Math.random() * 10),
      description: 'Seeded for header scroll testing'
    });

    const itemsToCreate = Array.from({ length: 12 }, (_, i) => makeItem(i + 1));
    const created = [];
    for (const data of itemsToCreate) {
      const it = await base44.entities.Item.create(data);
      created.push(it);
    }

    return Response.json({ success: true, created: created.length, supplier_id: supplier.id, supplier_name: supplier.name });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});