import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrls } = await req.json();
    if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) return Response.json({ error: 'Missing fileUrls' }, { status: 400 });

    // Fetch existing recipes
    const existingRecipes = await base44.entities.Recipe.filter({ created_by: user.email });
    const existingNames = existingRecipes.map(r => r.name.trim().toLowerCase());

    // Use LLM to extract menu items
    const prompt = `קרא את כל קבצי התמונות המצורפים של התפריט וחלץ את כל שמות המנות.
המבנה בתפריט הוא לרוב: שורה ראשונה עם שם המנה והמחיר, ושורה שנייה עם תיאור.
לדוגמה:
"ניגורי מיול 58" -> שם המנה הוא "ניגורי מיול"
"טמפורה טעימה 52" -> שם המנה הוא "טמפורה טעימה"

המשימה שלך:
1. עבור על כל התמונות המצורפות.
2. חלץ את השם של כל מנה (הטקסט לפני המחיר בשורה הראשונה של כל פריט).
3. התעלם מהמחירים ומהתיאורים.
4. החזר אובייקט JSON עם מערך 'menu_items' המכיל את רשימת השמות המלאה מכל הקבצים.
ודא שאתה כולל את כל המנות, כולל "טמפורה טעימה", "ניגורי מיול", "מרק מיסו", "מה פאו" וכו'.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
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