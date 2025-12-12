import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify the requester is authenticated
    const requester = await base44.auth.me();
    if (!requester) {
      console.error('[createItemForStore] Not authenticated');
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[createItemForStore] Requester:', requester.email);

    const { itemData, storeEmail } = await req.json();
    
    console.log('[createItemForStore] Received data:', { itemData, storeEmail });
    
    if (!itemData || !storeEmail) {
      console.error('[createItemForStore] Missing data');
      return Response.json({ success: false, error: 'Missing required data' }, { status: 400 });
    }

    // Validate required fields
    if (!itemData.name || !itemData.supplier_id || !itemData.unit) {
      console.error('[createItemForStore] Missing required fields:', itemData);
      return Response.json({ success: false, error: 'Missing required item fields (name, supplier_id, unit)' }, { status: 400 });
    }

    // Create item with the store owner's email as created_by using service role
    console.log('[createItemForStore] Creating item with service role...');
    const newItem = await base44.asServiceRole.entities.Item.create({
      ...itemData,
      created_by: storeEmail
    });

    console.log('[createItemForStore] Item created successfully:', newItem.id);
    return Response.json({ success: true, item: newItem });

  } catch (error) {
    console.error('[createItemForStore] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create item'
    }, { status: 500 });
  }
});