import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const userEmail = "guestroom@smartplate.org";

  const suppliers = await base44.asServiceRole.entities.Supplier.filter({
    created_by: userEmail
  }, null, 1000);

  const oliphantSuppliers = suppliers.filter(s => s.name && s.name.includes("אוליפנט"));
  
  const items = await base44.asServiceRole.entities.Item.filter({
    created_by: userEmail
  }, null, 5000);

  const oliphantItems = items.filter(i => i.supplier_name && i.supplier_name.includes("אוליפנט"));

  return Response.json({
    oliphantSuppliers,
    oliphantItemsCount: oliphantItems.length,
    oliphantItemsNames: oliphantItems.map(i => i.name).slice(0, 10)
  });
});