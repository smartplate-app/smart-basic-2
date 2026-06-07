import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { store_id, pin, role } = await req.json();

    if (!store_id || !pin) {
      return Response.json({ success: false, error: 'Missing store_id or pin' }, { status: 400 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: store_id });
    if (!users || users.length === 0) {
      return Response.json({ success: false, error: 'Invalid link' });
    }

    const owner = users[0];

    // Use role-specific PIN: manager_access_pin or worker_access_pin
    const pinField = role === 'manager' ? 'manager_access_pin' : 'worker_access_pin';
    const storedPin = owner[pinField];

    if (!storedPin) {
      return Response.json({ success: false, error: 'No PIN set for this role' });
    }

    if (storedPin !== pin.trim()) {
      return Response.json({ success: false, error: 'PIN שגוי' });
    }

    return Response.json({
      success: true,
      role: role || 'worker',
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