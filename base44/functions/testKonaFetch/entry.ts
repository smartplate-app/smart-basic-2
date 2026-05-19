import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const konaItems = await base44.asServiceRole.entities.Item.filter({ created_by: 'konaburgerltd@gmail.com' }, "-created_date", 10000);
        
        const prepItems = konaItems.filter(i => i.supplier_name === 'Prep Recipe' || i.supplier_name === 'הכנות' || i.supplier_name === 'הכנה');

        return Response.json({ 
            totalKonaItems: konaItems.length,
            prepItemsCount: prepItems.length,
            samplePrepItems: prepItems.map(i => i.name).slice(0, 10)
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});