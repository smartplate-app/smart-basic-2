import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseSpreadsheetId(input) {
  if (!input) return null;
  const m = String(input).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (input.length > 30 ? input : null);
}

function normalizeUnit(u) {
  if (!u) return 'unit';
  const s = String(u).trim().toLowerCase();
  if (['יח', 'יחידה', 'יח׳', 'pcs', 'piece'].some(k => s.includes(k))) return 'unit';
  if (['ק"ג', 'קג', 'קילו', 'kg'].some(k => s.includes(k))) return 'kg';
  if (['גרם', 'גר', 'g', 'gram'].some(k => s.includes(k))) return 'gram';
  if (['ליטר', 'liter', 'lt'].some(k => s.includes(k))) return 'liter';
  if (['מ"ל', 'מל', 'ml'].some(k => s.includes(k))) return 'ml';
  if (['ארגז', 'מארז', 'case', 'box'].some(k => s.includes(k))) return 'case';
  return 'unit';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { spreadsheetUrl, spreadsheetId: rawId, parsedData, providedPrices } = await req.json();
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl) || rawId;
    if (!spreadsheetId) return Response.json({ error: 'Missing spreadsheetId/url' }, { status: 400 });

    let allItems = [];
    let allRecipes = [];

    if (parsedData) {
      if (parsedData.items) allItems.push(...parsedData.items);
      if (parsedData.recipes) allRecipes.push(...parsedData.recipes);
    } else {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

      // Get all sheets
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!metaRes.ok) {
        return Response.json({ error: 'Failed to read spreadsheet metadata' }, { status: 500 });
      }
      const metaData = await metaRes.json();
      const sheetNames = metaData.sheets.map(s => s.properties.title);

      let allRowsData = "";

      for (const sheetName of sheetNames) {
        const range = `'${sheetName}'!A1:Z200`;
        const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!getRes.ok) continue;
        
        const data = await getRes.json();
        const rows = data.values || [];
        if (rows.length < 2) continue;

        allRowsData += `\n\n--- גיליון: ${sheetName} ---\n` + JSON.stringify(rows.slice(0, 200));
      }

      if (!allRowsData) {
        return Response.json({ error: 'No data found in spreadsheet' }, { status: 400 });
      }

      // Use LLM to parse all sheets at once
      const prompt = `קלט: נתונים ממספר גיליונות בגוגל שיטס.
הנתונים יכולים להכיל פריטי מלאי (חומרי גלם) או מתכונים (הכנות מטבח או מנות סופיות).
אנא נתח את הנתונים והחזר JSON עם שני מערכים:
1. items: פריטי מלאי (חומרי גלם). שדות: name, unit (unit/kg/gram/liter/ml/case), price (מספר), catalog_number, supplier_name (שם הספק - חשוב מאוד לחלץ מעמודת הספק אם קיימת).
2. recipes: מתכונים. שדות: 
   - name: שם המתכון
   - type: 'prep_recipe' (הכנת מטבח) או 'sale_item' (מנה למכירה)
   - yield_quantity: כמות תוצר (מספר, ברירת מחדל 1)
   - yield_unit: יחידת מידה של התוצר (unit/kg/gram/liter/ml)
   - sale_price: מחיר מכירה (למנות סופיות, מספר)
   - ingredients: מערך של מרכיבים, כל אחד עם { item_name: שם המרכיב, quantity: כמות (מספר), unit: יחידת מידה }.

שים לב למבנה הנתונים:
- ייתכן שהמתכונים מוצגים בצורה אנכית/טבלאית מורכבת. למשל, עמודה אחת מכילה את הכותרות ("שם הכנת מטבח", "יחידת מידה", "משקל כולל") והעמודה השנייה את הערכים ("חמוצים יפנים", "ק"ג", "5").
- מתחת לזה ייתכן שיופיעו כותרות למרכיבים ("כמות יחידות", "שם פריט המלאי") ומתחתיהן שורות של המרכיבים עצמם.
- עליך להבין את המבנה הלוגי מתוך הנתונים ולחלץ את כל המתכונים והמרכיבים שלהם.
- אם הגיליון מכיל מנות סופיות (למשל "שם המנה בתפריט"), סווג אותן כ-'sale_item'. אם זה "הכנת מטבח", סווג כ-'prep_recipe'.
- עבור פריטי מלאי, חפש עמודה של "שם הספק" (או דומה) ושייך את שם הספק לכל פריט.
- קשר בין מתכוני הכנה למנות סופיות: אם מנה סופית משתמשת בהכנת מטבח כמרכיב, רשום את שם הכנת המטבח ב-item_name של המרכיב.

הנתונים:
${allRowsData}
`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash', // Use a model with larger context window and good reasoning
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  unit: { type: 'string' },
                  price: { type: 'number' },
                  catalog_number: { type: 'string' },
                  supplier_name: { type: 'string' }
                },
                required: ['name']
              }
            },
            recipes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['prep_recipe', 'sale_item'] },
                  yield_quantity: { type: 'number' },
                  yield_unit: { type: 'string' },
                  sale_price: { type: 'number' },
                  ingredients: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        item_name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit: { type: 'string' }
                      },
                      required: ['item_name', 'quantity']
                    }
                  }
                },
                required: ['name', 'type', 'ingredients']
              }
            }
          }
        }
      });

      if (response.items) allItems.push(...response.items);
      if (response.recipes) allRecipes.push(...response.recipes);
    }

    // Fetch existing items to avoid duplicates
    const existingItems = await base44.entities.Item.filter({ created_by: user.email });
    const itemMap = new Map(existingItems.map(it => [it.name.trim().toLowerCase(), it]));

    // Check for missing ingredients
    const futureItemMap = new Map(itemMap);
    for (const it of allItems) {
      if (it.name) futureItemMap.set(it.name.trim().toLowerCase(), it);
    }
    for (const r of allRecipes) {
      if (r.type === 'prep_recipe' && r.name) {
        futureItemMap.set(r.name.trim().toLowerCase(), r);
      }
    }

    const missingItemsMap = new Map();
    for (const r of allRecipes) {
      for (const ing of (r.ingredients || [])) {
        const itemNameLower = (ing.item_name || '').trim().toLowerCase();
        if (!itemNameLower) continue;
        
        let found = futureItemMap.get(itemNameLower);
        if (!found) {
          found = Array.from(futureItemMap.values()).find(i => i.name?.toLowerCase().includes(itemNameLower) || itemNameLower.includes(i.name?.toLowerCase()));
        }

        if (!found) {
          if (providedPrices && Object.prototype.hasOwnProperty.call(providedPrices, itemNameLower)) {
            const newItem = {
              name: ing.item_name,
              unit: normalizeUnit(ing.unit),
              price: Number(providedPrices[itemNameLower]) || 0,
              supplier_name: 'כללי'
            };
            allItems.push(newItem);
            futureItemMap.set(itemNameLower, newItem);
          } else {
            missingItemsMap.set(itemNameLower, { name: ing.item_name, unit: ing.unit });
          }
        }
      }
    }

    if (missingItemsMap.size > 0) {
      return Response.json({
        success: true,
        requires_prices: true,
        missing_items: Array.from(missingItemsMap.values()),
        parsedData: { items: allItems, recipes: allRecipes }
      });
    }

    // Handle Suppliers
    const existingSuppliers = await base44.entities.Supplier.filter({ created_by: user.email });
    const supplierMap = new Map(existingSuppliers.map(s => [s.name.trim().toLowerCase(), s]));
    
    // Find unique new suppliers from items
    const newSupplierNames = new Set();
    allItems.forEach(it => {
      const sName = (it.supplier_name || 'כללי').trim();
      if (sName && !supplierMap.has(sName.toLowerCase())) {
        newSupplierNames.add(sName);
      }
    });

    // Create new suppliers
    if (newSupplierNames.size > 0) {
      const suppliersToCreate = Array.from(newSupplierNames).map(name => ({
        name: name,
        supplier_type: 'simple'
      }));
      const createdSuppliers = await base44.entities.Supplier.bulkCreate(suppliersToCreate);
      createdSuppliers.forEach(s => supplierMap.set(s.name.trim().toLowerCase(), s));
    }
    
    // Fallback default supplier if needed
    let defaultSupplier = supplierMap.get('כללי') || supplierMap.get('general');
    if (!defaultSupplier) {
      defaultSupplier = await base44.entities.Supplier.create({ name: 'כללי', supplier_type: 'simple' });
      supplierMap.set('כללי', defaultSupplier);
    }

    // Process and save items
    const validItems = allItems.filter(it => it.name).map(it => {
      const sName = (it.supplier_name || 'כללי').trim();
      const supplier = supplierMap.get(sName.toLowerCase()) || defaultSupplier;
      
      return {
        name: it.name,
        unit: normalizeUnit(it.unit),
        price: Number(it.price) || 0,
        catalog_number: it.catalog_number || undefined,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        units_per_package: 1,
        minimum_stock: 0,
        discount: 0
      };
    });

    let createdItemsCount = 0;
    let updatedItemsCount = 0;
    const itemsToCreate = [];

    for (const itemData of validItems) {
      const existing = itemMap.get(itemData.name.trim().toLowerCase());
      if (existing) {
        // Update if changed
        const hasChanges = existing.price !== itemData.price || 
                           existing.unit !== itemData.unit || 
                           existing.supplier_id !== itemData.supplier_id ||
                           existing.catalog_number !== itemData.catalog_number;
        if (hasChanges) {
          await base44.entities.Item.update(existing.id, itemData);
          updatedItemsCount++;
          itemMap.set(itemData.name.trim().toLowerCase(), { ...existing, ...itemData });
        }
      } else {
        itemsToCreate.push(itemData);
      }
    }

    if (itemsToCreate.length > 0) {
      const created = await base44.entities.Item.bulkCreate(itemsToCreate);
      createdItemsCount = created.length;
      created.forEach(it => itemMap.set(it.name.trim().toLowerCase(), it));
    }

    // We also need to map prep recipes to items, because a recipe might use a prep recipe as an ingredient.
    const prepRecipeItemsToCreate = [];
    const prepRecipeItems = allRecipes.filter(r => r.type === 'prep_recipe').map(r => ({
      name: r.name,
      unit: normalizeUnit(r.yield_unit),
      price: 0, // Cost will be calculated dynamically in the app, but we need the item record
      supplier_id: defaultSupplier.id,
      supplier_name: 'Prep Recipe',
      units_per_package: 1,
      minimum_stock: 0,
      discount: 0
    }));

    for (const itemData of prepRecipeItems) {
      const existing = itemMap.get(itemData.name.trim().toLowerCase());
      if (!existing) {
        prepRecipeItemsToCreate.push(itemData);
      }
    }

    if (prepRecipeItemsToCreate.length > 0) {
      const createdPrepItems = await base44.entities.Item.bulkCreate(prepRecipeItemsToCreate);
      for (const it of createdPrepItems) {
        itemMap.set(it.name.trim().toLowerCase(), it);
      }
    }

    // Fetch existing recipes to avoid duplicates
    const existingRecipes = await base44.entities.Recipe.filter({ created_by: user.email });
    const recipeMap = new Map(existingRecipes.map(r => [r.name.trim().toLowerCase(), r]));

    // Process and save recipes
    const validRecipes = allRecipes.filter(r => r.name).map(r => {
      let totalCost = 0;
      const ingredients = (r.ingredients || []).map(ing => {
        const itemNameLower = (ing.item_name || '').trim().toLowerCase();
        // Try to find exact match, or partial match
        let item = itemMap.get(itemNameLower);
        if (!item) {
          item = Array.from(itemMap.values()).find(i => i.name.toLowerCase().includes(itemNameLower) || itemNameLower.includes(i.name.toLowerCase()));
        }
        
        const cost = item ? (Number(item.price_after_discount || item.price || 0) * Number(ing.quantity)) : 0;
        totalCost += cost;
        return {
          item_id: item ? item.id : null,
          item_name: ing.item_name,
          quantity: Number(ing.quantity) || 0,
          unit: normalizeUnit(ing.unit),
          cost: cost,
          unit_price: item ? Number(item.price_after_discount || item.price || 0) : 0
        };
      });

      return {
        name: r.name,
        type: r.type === 'prep_recipe' ? 'prep_recipe' : 'sale_item',
        yield_quantity: Number(r.yield_quantity) || 1,
        yield_unit: normalizeUnit(r.yield_unit),
        sale_price: Number(r.sale_price) || 0,
        total_cost: totalCost,
        ingredients: ingredients
      };
    });

    let createdRecipesCount = 0;
    let updatedRecipesCount = 0;
    const recipesToCreate = [];

    for (const recipeData of validRecipes) {
      const existing = recipeMap.get(recipeData.name.trim().toLowerCase());
      if (existing) {
        // Update if changed
        const hasChanges = existing.sale_price !== recipeData.sale_price ||
                           existing.yield_quantity !== recipeData.yield_quantity ||
                           existing.yield_unit !== recipeData.yield_unit ||
                           JSON.stringify(existing.ingredients) !== JSON.stringify(recipeData.ingredients);
        if (hasChanges) {
          await base44.entities.Recipe.update(existing.id, recipeData);
          updatedRecipesCount++;
        }
      } else {
        recipesToCreate.push(recipeData);
      }
    }

    if (recipesToCreate.length > 0) {
      const created = await base44.entities.Recipe.bulkCreate(recipesToCreate);
      createdRecipesCount = created.length;
    }

    return Response.json({ 
      success: true, 
      created_items_count: createdItemsCount,
      updated_items_count: updatedItemsCount,
      created_recipes_count: createdRecipesCount,
      updated_recipes_count: updatedRecipesCount,
      message: `Imported: ${createdItemsCount} new items, ${updatedItemsCount} updated items. ${createdRecipesCount} new recipes, ${updatedRecipesCount} updated recipes.`
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});