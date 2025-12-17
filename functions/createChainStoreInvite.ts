import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { chainName, storeName, inviteeEmail, inviteeName, sendEmail } = await req.json();

    if (!storeName || !inviteeEmail || !inviteeName) {
      return Response.json({ success: false, error: 'storeName, inviteeEmail, inviteeName are required' }, { status: 400 });
    }

    // 1) Find or create chain for head user
    let chainList = await base44.asServiceRole.entities.Chain.filter({ head_store_user_email: me.email });
    let chain = chainList && chainList[0] ? chainList[0] : null;

    if (!chain) {
      const newChain = await base44.asServiceRole.entities.Chain.create({
        name: chainName || `${me.business_name || me.full_name || 'My'} Chain`,
        head_store_user_email: me.email,
        description: ''
      });
      chain = newChain;

      // Ensure head store record exists
      await base44.asServiceRole.entities.ChainStore.create({
        chain_id: chain.id,
        chain_name: chain.name,
        store_name: me.business_name || 'Head Store',
        store_address: me.business_address || '',
        user_email: me.email,
        is_head_store: true
      });

      // Mark current user as chain head
      try {
        await base44.asServiceRole.entities.User.update(me.id, { is_chain_head: true, chain_id: chain.id });
      } catch (e) {
        // Fallback: ignore if user entity update not permitted; the UI can still infer from Chain
      }
    } else {
      // Try to mark as chain head if not already
      try {
        if (!me.is_chain_head || me.chain_id !== chain.id) {
          await base44.asServiceRole.entities.User.update(me.id, { is_chain_head: true, chain_id: chain.id });
        }
      } catch {}
    }

    // 2) Create chain store placeholder for the invitee (manager of new restaurant)
    await base44.asServiceRole.entities.ChainStore.create({
      chain_id: chain.id,
      chain_name: chain.name,
      store_name: storeName,
      user_email: inviteeEmail,
      is_head_store: false
    });

    // 2b) Ensure a Base44 User exists (silent platform invite - no email needed)
    let createdUserId = null;
    try {
      const existing = await base44.asServiceRole.entities.User.filter({ email: inviteeEmail.toLowerCase() });
      if (!existing || existing.length === 0) {
        const newUser = await base44.asServiceRole.entities.User.create({
          email: inviteeEmail.toLowerCase(),
          full_name: inviteeName,
          role: 'user'
        });
        createdUserId = newUser.id;
      } else {
        createdUserId = existing[0].id;
      }
    } catch (e) {
      console.warn('[createChainStoreInvite] Could not ensure platform user exists:', e?.message || e);
    }

    // 3) Create UserInvite (type = chain_store)
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days

    const inviteRecord = await base44.asServiceRole.entities.UserInvite.create({
      token,
      email: inviteeEmail,
      full_name: inviteeName,
      invite_type: 'chain_store',
      chain_id: chain.id,
      chain_name: chain.name,
      store_id: '',
      store_name: storeName,
      role: 'manager',
      inviter_email: me.email,
      inviter_name: me.full_name || me.email,
      restaurant_name: me.business_name || 'Head Store',
      restaurant_address: me.business_address || '',
      expires_at: expiresAt.toISOString(),
      used: false
    });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const inviteLink = `${origin}/#/pages/RestaurantInvite?token=${token}`;

    if (sendEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: inviteeEmail,
          subject: `Invitation to manage ${storeName} in ${chain.name}`,
          body: `Hello ${inviteeName},\n\nYou have been invited to manage a restaurant (${storeName}) in the chain ${chain.name}.\nClick the link to join: ${inviteLink}\n\nRegards,\n${me.full_name || me.email}`
        });
      } catch (e) {
        // Non-fatal if email fails
        console.warn('[createChainStoreInvite] Email sending failed:', e?.message || e);
      }
    }

    return Response.json({ success: true, chain, token, inviteLink, invite_id: inviteRecord.id });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to create invite' }, { status: 500 });
  }
});