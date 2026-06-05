import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const entities = Object.keys(base44.asServiceRole.entities);
        const matches = [];
        for (const entity of entities) {
            try {
                if (typeof base44.asServiceRole.entities[entity].filter === 'function') {
                    const records = await base44.asServiceRole.entities[entity].filter({}, null, 5000);
                    for (const r of records) {
                        if (JSON.stringify(r).includes('docs.google.com/spreadsheets') || JSON.stringify(r).includes('1Z3_') || JSON.stringify(r).includes('kona')) {
                            if (entity !== 'Item' && entity !== 'SupplyReceipt' && entity !== 'User') {
                                matches.push({ entity, id: r.id, match: JSON.stringify(r).substring(0, 100) });
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        return Response.json({ matches });
    } catch(e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});