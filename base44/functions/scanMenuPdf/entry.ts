import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrl } = await req.json();
    if (!fileUrl) return Response.json({ error: 'Missing fileUrl' }, { status: 400 });

    // Fetch existing recipes
    const existingRecipes = await base44.entities.Recipe.filter({ created_by: user.email });
    const existingNames = existingRecipes.map(r => r.name.trim().toLowerCase());

    // Use LLM to extract menu items
    const prompt = `קרא את כל התפריט המצורף (תמונה או PDF) וחלץ את כל פריטי המזון והשתייה (מנות, מתכונים, משקאות).
החזר אובייקט JSON עם מערך של מחרוזות בשם 'menu_items' המכיל את שמות המנות בדיוק כפי שהם מופיעים בתפריט בעברית.
אל תכלול מחירים, תיאורים או כותרות של קטגוריות. רק את שמות המנות.
חשוב: קרא את כל הדפים וכל העמודות בתפריט ואל תדלג על אף מנה.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          menu_items: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['menu_items']
      }
    });

    const menuItems = response.menu_items || [];
    
    // Find missing recipes
    const missingRecipes = [];
    for (const item of menuItems) {
      const itemLower = item.trim().toLowerCase();
      // Simple fuzzy match: check if item is included in any existing recipe name or vice versa
      const exists = existingNames.some(existing => 
        existing === itemLower || 
        existing.includes(itemLower) || 
        itemLower.includes(existing)
      );
      
      if (!exists) {
        missingRecipes.push(item.trim());
      }
    }

    return Response.json({ success: true, missingRecipes, totalFound: menuItems.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});