import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Use service role to read ChainStore even if created by head
    const stores = await base44.asServiceRole.entities.ChainStore.filter({ user_email: me.email });
    if (!stores || stores.length === 0) {
      return Response.json({ success: true, found: false });
    }

    const store = stores[0];
    let chain = null;
    try {
      const chains = await base44.asServiceRole.entities.Chain.filter({ id: store.chain_id });
      chain = chains && chains[0] ? chains[0] : null;
    } catch {}

    return Response.json({
      success: true,
      found: true,
      chain_id: store.chain_id,
      chain_name: store.chain_name || chain?.name || '',
      is_head_store: !!store.is_head_store,
      head_store_user_email: chain?.head_store_user_email || null,
      store_name: store.store_name || ''
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to resolve chain context' }, { status: 500 });
  }
});