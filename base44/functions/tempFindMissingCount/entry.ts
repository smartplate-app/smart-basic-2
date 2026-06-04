import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const collections = ['InventoryCount', 'SupplyReceipt', 'Warehouse', 'Order', 'MonthlyDashboardData', 'WasteReport', 'CogsReport', 'HourlySalesReport'];
        const matches = [];
        const valueToFind = 5921.08;

        for (const col of collections) {
            const records = await base44.asServiceRole.entities[col].filter({});
            for (const r of records) {
                const str = JSON.stringify(r);
                if (str.includes('5921.08') || str.includes('5921.1') || str.includes('5921.0') || str.includes('5921')) {
                    matches.push({
                        collection: col,
                        id: r.id,
                        match: 'Contains 5921'
                    });
                }
            }
        }
        
        return Response.json({ matches });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});