import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { reportId } = await req.json();

        if (!reportId) {
            return Response.json({ error: 'Report ID is required' }, { status: 400 });
        }

        await base44.asServiceRole.entities.CogsReport.delete(reportId);

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error deleting COGS report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});