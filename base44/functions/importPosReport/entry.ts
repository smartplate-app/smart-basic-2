import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url } = await req.json();
        
        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        // Extract data from the uploaded file using the Core integration
        const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
                type: "object",
                properties: {
                    item_name: { type: "string", description: "Name of the product/item (e.g., פריט, Item, שם פריט)" },
                    quantity_sold: { type: "number", description: "Total quantity sold for this item (e.g., כמות, Qty, Sold)" },
                    total_sales: { type: "number", description: "Total sales/revenue amount for this item (e.g., סה״כ, סכום, Total Sales, סה״כ מכירות)" }
                },
                required: ["item_name", "quantity_sold", "total_sales"]
            }
        });

        if (extractRes.status !== 'success' || !Array.isArray(extractRes.output)) {
            console.error("Extraction failed or invalid output:", extractRes);
            return Response.json({ error: 'Failed to extract data from the file. Please ensure it is a valid POS report with Item, Quantity, and Sales columns.' }, { status: 400 });
        }

        const extractedItems = extractRes.output;
        
        // Fetch user's recipes to match and get cost data
        const workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
        const recipes = await base44.entities.Recipe.filter({ type: 'sale_item', created_by: workingEmail });
        
        const mappedItems = extractedItems.map(extItem => {
            // Find a matching recipe
            const matchedRecipe = recipes.find(r => 
                r.name.toLowerCase().trim() === extItem.item_name.toLowerCase().trim()
            );

            let unitCost = 0;
            let costPercentage = 0;
            let recipeId = null;

            if (matchedRecipe) {
                unitCost = matchedRecipe.use_manual_cost ? (matchedRecipe.manual_cost || 0) : (matchedRecipe.total_cost || 0);
                recipeId = matchedRecipe.id;
                costPercentage = matchedRecipe.cost_percentage || 0;
            }

            return {
                item_name: extItem.item_name,
                quantity_sold: extItem.quantity_sold,
                total_sales: extItem.total_sales,
                unit_price: extItem.quantity_sold > 0 ? (extItem.total_sales / extItem.quantity_sold) : 0,
                unit_cost: unitCost,
                cost_percentage: costPercentage,
                recipe_id: recipeId
            };
        });

        // Filter out items with 0 quantity or sales
        const validItems = mappedItems.filter(item => item.quantity_sold > 0 && item.total_sales > 0);

        return Response.json({ 
            success: true, 
            items: validItems 
        });

    } catch (error) {
        console.error("Error in importPosReport:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});