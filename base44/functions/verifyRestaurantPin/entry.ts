import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { store_id, pin } = await req.json();

    if (!store_id || !pin) {
      return Response.json({ success: false, error: 'Missing store_id or pin' }, { status: 400 });
    }

    // Find the owner by store_id (user id)
    const users = await base44.asServiceRole.entities.User.filter({ id: store_id });
    if (!users || users.length === 0) {
      return Response.json({ success: false, error: 'Invalid link' });
    }

    const owner = users[0];

    if (!owner.restaurant_access_pin) {
      return Response.json({ success: false, error: 'No PIN set for this restaurant' });
    }

    if (owner.restaurant_access_pin !== pin.trim()) {
      return Response.json({ success: false, error: 'PIN שגוי' });
    }

    return Response.json({
      success: true,
      owner_email: owner.email,
      owner_name: owner.full_name,
      business_name: owner.business_name || owner.full_name,
      store_id: owner.id
    });

  } catch (error) {
    console.error('[verifyRestaurantPin] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});