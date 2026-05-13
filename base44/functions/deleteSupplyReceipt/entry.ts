import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { receiptId } = await req.json();
        if (!receiptId) {
            return Response.json({ error: 'Missing receiptId' }, { status: 400 });
        }

        const isAdminImpersonating = user.role === 'admin' && user.acting_as_user_email;
        const api = isAdminImpersonating ? base44.asServiceRole.entities : base44.entities;

        await api.SupplyReceipt.delete(receiptId);

        return Response.json({ success: true });

    } catch (error) {
        console.error('Delete receipt failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});