import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify the requester is authenticated
    const requester = await base44.auth.me();
    if (!requester) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { itemData, storeEmail } = await req.json();
    
    if (!itemData || !storeEmail) {
      return Response.json({ success: false, error: 'Missing required data' }, { status: 400 });
    }

    // Create item with the store owner's email as created_by using service role
    const newItem = await base44.asServiceRole.entities.Item.create({
      ...itemData,
      created_by: storeEmail
    });

    return Response.json({ success: true, item: newItem });

  } catch (error) {
    console.error('[createItemForStore] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to create item'
    }, { status: 500 });
  }
});