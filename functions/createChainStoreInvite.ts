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
    const store = await base44.asServiceRole.entities.ChainStore.create({
      chain_id: chain.id,
      chain_name: chain.name,
      store_name: storeName,
      user_email: inviteeEmail,
      is_head_store: false
    });

    // 2b) Ensure a Base44 User exists and attach chain context (no links/emails)
    let createdUserId = null;
    try {
      const existing = await base44.asServiceRole.entities.User.filter({ email: inviteeEmail.toLowerCase() });
      if (!existing || existing.length === 0) {
        const newUser = await base44.asServiceRole.entities.User.create({
          email: inviteeEmail.toLowerCase(),
          full_name: inviteeName,
          role: 'user',
          chain_id: chain.id,
          is_chain_head: false,
          business_name: storeName
        });
        createdUserId = newUser.id;
      } else {
        createdUserId = existing[0].id;
        // Update user with chain info (idempotent)
        await base44.asServiceRole.entities.User.update(createdUserId, {
          chain_id: chain.id,
          is_chain_head: false,
          business_name: storeName
        });
      }
    } catch (e) {
      console.warn('[createChainStoreInvite] Could not ensure platform user exists/updated:', e?.message || e);
    }

    return Response.json({ success: true, chain, store, user_id: createdUserId });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to create invite' }, { status: 500 });
  }
});