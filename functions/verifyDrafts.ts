import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional payload: { targetEmail?: string } (admin only)
    let payload = {};
    try {
      payload = await req.json();
    } catch (_) {
      payload = {};
    }

    const requestedEmail = typeof payload?.targetEmail === 'string' ? payload.targetEmail : null;
    const isAdmin = user?.role === 'admin';

    // Active context email (aligns with frontend logic); ignore admin control if not needed
    const workingEmail = (user?.acting_as_store_email || (isAdmin && requestedEmail) || user.email);

    // Primary query: drafts created by the active context user
    let myDrafts = [];
    try {
      myDrafts = await base44.entities.Order.filter({ created_by: workingEmail, status: 'draft' }, '-created_date');
    } catch (_) { myDrafts = []; }

    // Fallback query: fetch all drafts by status and filter client-side for creator
    let fallbackDrafts = [];
    try {
      const draftsByStatus = await base44.entities.Order.filter({ status: 'draft' }, '-created_date');
      fallbackDrafts = (draftsByStatus || []).filter(o => o?.created_by === workingEmail);
    } catch (_) { fallbackDrafts = []; }

    // Merge + de-duplicate
    const seen = new Set();
    const merged = [...myDrafts, ...fallbackDrafts].filter(o => {
      if (!o?.id || seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    const sample = merged.slice(0, 5).map(o => ({
      id: o.id,
      supplier_name: o.supplier_name || null,
      order_number: o.order_number || null,
      status: o.status || null,
      created_date: o.created_date || null,
      created_by: o.created_by || null
    }));

    return Response.json({
      success: true,
      user_email: user.email,
      working_email: workingEmail,
      myDrafts_count: myDrafts.length,
      fallback_count: fallbackDrafts.length,
      merged_unique_count: merged.length,
      sample
    });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
});