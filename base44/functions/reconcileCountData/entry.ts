import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { extracted_data } = await req.json();

        if (!extracted_data || !extracted_data.items) {
            return Response.json({ error: 'No data provided' }, { status: 400 });
        }

        console.log(`[reconcileCountData] Reconciling ${extracted_data.items.length} items...`);

        // Get all items from the system
        const items = await base44.asServiceRole.entities.Item.filter({ created_by: user.email });

        console.log(`[reconcileCountData] Found ${items.length} items in catalog`);

        // Function to calculate similarity between two strings
        const calculateSimilarity = (str1, str2) => {
            const s1 = str1.toLowerCase().trim();
            const s2 = str2.toLowerCase().trim();
            
            // Exact match
            if (s1 === s2) return 1.0;
            
            // Contains match
            if (s1.includes(s2) || s2.includes(s1)) return 0.8;
            
            // Word overlap
            const words1 = s1.split(/\s+/);
            const words2 = s2.split(/\s+/);
            const commonWords = words1.filter(w => words2.includes(w)).length;
            const totalWords = Math.max(words1.length, words2.length);
            
            return commonWords / totalWords;
        };

        // Find matches
        const matches = [];
        
        for (const scannedItem of extracted_data.items) {
            // Try to find matching item in catalog
            for (const catalogItem of items) {
                const itemSimilarity = calculateSimilarity(scannedItem.item_name, catalogItem.name);
                
                if (itemSimilarity >= 0.7) {
                    // Check if price is different
                    const scannedPrice = scannedItem.price_per_unit;
                    const catalogPrice = catalogItem.price || 0;
                    
                    if (Math.abs(scannedPrice - catalogPrice) > 0.01) {
                        matches.push({
                            scanned_item: scannedItem.item_name,
                            scanned_price: scannedPrice,
                            catalog_item_id: catalogItem.id,
                            catalog_item_name: catalogItem.name,
                            catalog_price: catalogPrice,
                            similarity: itemSimilarity,
                            quantity: scannedItem.counted_quantity
                        });
                    }
                }
            }
        }

        console.log(`[reconcileCountData] Found ${matches.length} price differences`);

        return Response.json({
            matches: matches.sort((a, b) => b.similarity - a.similarity)
        });

    } catch (error) {
        console.error("[reconcileCountData] Error:", error);
        return Response.json({ 
            error: error.message || 'Failed to reconcile data' 
        }, { status: 500 });
    }
});