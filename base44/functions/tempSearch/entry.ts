import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const userEmail = "guestroom@smartplate.org";

  const suppliersOwner = await base44.asServiceRole.entities.Supplier.filter({
    store_owner_email: userEmail
  }, null, 5000);
  const suppliersCreator = await base44.asServiceRole.entities.Supplier.filter({
    created_by: userEmail
  }, null, 5000);

  const suppliers = [...suppliersOwner, ...suppliersCreator];
  // Deduplicate the array by ID just in case
  const uniqueSuppliers = Array.from(new Map(suppliers.map(s => [s.id, s])).values());

  const oliphantSuppliers = uniqueSuppliers.filter(s => 
    s.name && s.name.includes("אוליפנט")
  );

  return Response.json({
    oliphantSuppliers
  });
});