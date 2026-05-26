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

    // Use Gemini LLM to extract menu items with full Hebrew support
    const prompt = `קרא את כל קבצי התמונות והמסמכים המצורפים של התפריט וחלץ את כל שמות המנות והמחירים שלהן.
המבנה בתפריט הוא לרוב: שורה ראשונה עם שם המנה והמחיר, ושורה שנייה עם תיאור.
לדוגמה:
"ניגורי מיול 58" -> שם המנה הוא "ניגורי מיול", מחיר: 58
"טמפורה טעימה 52" -> שם המנה הוא "טמפורה טעימה", מחיר: 52

המשימה שלך:
1. עבור על כל התמונות המצורפות.
2. חלץ את השם והמחיר של כל מנה.
3. החזר אובייקט JSON עם מערך 'menu_items' המכיל אובייקטים עם 'name' (שם המנה) ו-'price' (מחיר המנה).
ודא שאתה קורא עברית בצורה תקינה וכולל את כל המנות.
VERY IMPORTANT: DO NOT TRANSLATE any dish names. Extract the exact text in its original language exactly as it appears in the menu. If the menu is in Hebrew, keep names in Hebrew. If in English, keep in English.`;

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
    // Reset is_from_last_scan for previous items
    const previousScannedItems1 = await base44.entities.Recipe.filter({ created_by: targetEmail, is_from_last_scan: true });
    for (const item of previousScannedItems1) {
      await base44.entities.Recipe.update(item.id, { is_from_last_scan: false });
    }
    
    if (targetEmail !== user.email) {
      const previousScannedItems2 = await base44.entities.Recipe.filter({ store_owner_email: targetEmail, is_from_last_scan: true });
      for (const item of previousScannedItems2) {
        await base44.entities.Recipe.update(item.id, { is_from_last_scan: false });
      }
    }

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
          store_owner_email: targetEmail,
          is_from_last_scan: true
        });
      }
    }

    return Response.json({ success: true, missingRecipes, addedCount: missingRecipes.length, totalFound: menuItems.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});