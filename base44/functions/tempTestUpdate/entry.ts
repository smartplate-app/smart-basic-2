import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        await base44.asServiceRole.entities.Item.update('6a2acd6ce0813c96e076f0e0', {
            warehouse_ids: ['test1'],
            warehouse_names: ['Test Warehouse']
        });
        
        const items = await base44.asServiceRole.entities.Item.filter({ id: '6a2acd6ce0813c96e076f0e0' });

        return Response.json({ success: true, item: items[0] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});