import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrls } = await req.json();
    if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) return Response.json({ error: 'Missing fileUrls' }, { status: 400 });

    const targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;

    // Fetch existing recipes
    const existingRecipes1 = await base44.entities.Recipe.filter({ created_by: targetEmail });
    const existingRecipes2 = await base44.entities.Recipe.filter({ store_owner_email: targetEmail });
    const existingNames = [...existingRecipes1, ...existingRecipes2].map(r => r.name.trim().toLowerCase());

    // Use Gemini LLM to extract menu items exactly as they appear (no translation)
    const prompt = `Read all attached menu images/documents and extract all dish names and their prices.
The structure is usually: dish name and price, sometimes followed by a description.

YOUR TASK:
1. Go over all attached images.
2. Extract the exact name and price of each dish.
3. Return a JSON object with a 'menu_items' array containing objects with 'name' (dish name) and 'price' (dish price as a number).
CRITICAL: DO NOT translate the dish names! Extract them in the EXACT SAME LANGUAGE as they appear in the original menu image (e.g., if the menu is in Greek, output the Greek text; if English, output English; if Hebrew, output Hebrew). Output the exact original text of the dish name.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      model: 'gemini_3_1_pro', // Full Hebrew support & excellent vision/PDF capabilities
      response_json_schema: {
        type: 'object',
        properties: {
          menu_items: {
            type: 'array',
            items: { 
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'number' }
              },
              required: ['name']
            }
          }
        },
        required: ['menu_items']
      }
    });

    const menuItems = response.menu_items || [];
    
    // Add missing recipes automatically
    const missingRecipes = [];
    const addedNames = new Set();
    
    for (const item of menuItems) {
      if (!item.name) continue;
      const itemName = item.name.trim();
      const itemLower = itemName.toLowerCase();
      
      const exists = existingNames.some(existing => existing === itemLower);
      
      if (!exists && !addedNames.has(itemLower)) {
        missingRecipes.push(itemName);
        addedNames.add(itemLower);
        
        await base44.entities.Recipe.create({
          name: itemName,
          type: 'sale_item',
          sale_price: item.price || 0,
          created_by: user.email,
          store_owner_email: targetEmail
        });
      }
    }

    return Response.json({ success: true, missingRecipes, addedCount: missingRecipes.length, totalFound: menuItems.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});