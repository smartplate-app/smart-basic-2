import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body.email || '').trim();
    const full_name = String(body.full_name || '').trim();
    const role = String(body.role || 'worker').trim();
    const invite_type = String(body.invite_type || 'store_user');
    const store_name = String(body.store_name || user.business_name || '').trim();
    const restaurant_name = String(body.restaurant_name || store_name || '').trim();
    const restaurant_address = String(body.restaurant_address || user.business_address || '').trim();

    if (!email || !full_name) {
      return Response.json({ success: false, error: 'email and full_name are required' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days validity

    const invite = await base44.asServiceRole.entities.UserInvite.create({
      token,
      email,
      full_name,
      invite_type, // 'store_user' | 'chain_store'
      chain_id: body.chain_id || '',
      chain_name: body.chain_name || '',
      store_id: body.store_id || '',
      store_name: store_name || '',
      role,
      inviter_email: user.email,
      inviter_name: user.full_name,
      restaurant_name: restaurant_name || '',
      restaurant_address: restaurant_address || '',
      expires_at: expires.toISOString(),
      used: false
    });

    return Response.json({ success: true, token: invite.token });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed creating invite' }, { status: 500 });
  }
});