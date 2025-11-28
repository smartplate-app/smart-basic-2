import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify the user is authenticated and is a chain head
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is a chain head
    if (!user.is_chain_head) {
      return Response.json({ error: 'Only chain heads can create suppliers for other stores' }, { status: 403 });
    }
    
    const { supplierData, storeEmail } = await req.json();
    
    if (!supplierData || !storeEmail) {
      return Response.json({ error: 'Missing supplierData or storeEmail' }, { status: 400 });
    }
    
    // Create the supplier with the store email stored in a custom field
    // since we can't override created_by, we'll use a store_owner_email field
    const supplier = await base44.asServiceRole.entities.Supplier.create({
      ...supplierData,
      store_owner_email: storeEmail
    });
    
    return Response.json({ success: true, supplier });
  } catch (error) {
    console.error("Error creating supplier for store:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});