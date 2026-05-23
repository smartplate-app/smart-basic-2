import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

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

// Helper to process sequentially with a small delay to avoid 429 rate limits
const processSequentially = async (items, fn) => {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    results.push(await fn(items[i]));
    await new Promise(resolve => setTimeout(resolve, 30)); // 30ms delay between calls
  }
  return results;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { spreadsheetUrl, spreadsheetId: rawId, parsedData, importType } = body;
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl) || rawId;
    if (!spreadsheetId) return Response.json({ error: 'Missing spreadsheetId/url' }, { status: 400 });

    let allRecipes = [];

    if (parsedData) {
      if (parsedData.recipes) allRecipes.push(...parsedData.recipes);
    } else {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

      // Get all sheets
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!metaRes.ok) {
        return Response.json({ error: 'Failed to read spreadsheet metadata' }, { status: 500 });
      }
      const metaData = await metaRes.json();
      const sheetNames = metaData.sheets.map(s => s.properties.title);

      const sheetFetchPromises = sheetNames.map(async (sheetName) => {
        const range = `'${sheetName}'!A1:Z1000`;
        const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!getRes.ok) return "";
        const data = await getRes.json();
        const rows = data.values || [];
        if (rows.length < 2) return "";
        return `\n\n--- גיליון: ${sheetName} ---\n` + JSON.stringify(rows.slice(0, 1000));
      });

      const sheetDataResults = await Promise.all(sheetFetchPromises);
      const validSheets = sheetDataResults.filter(d => d && d.trim().length > 0);

      if (validSheets.length === 0) {
        return Response.json({ error: 'No data found in spreadsheet' }, { status: 400 });
      }

      // Run AI processing on each sheet sequentially to avoid context length limits & rate limits
      const parsedResults = await processSequentially(validSheets, async (sheetData) => {
        const prompt = `You are parsing a restaurant Google Sheets file into structured JSON.
We are extracting ONLY records of type: '${importType}'.
If importType is 'prep_recipe', look for recipes that yield a batch (e.g. 1kg of sauce, preparations, etc).
If importType is 'sale_item', look for recipes for dishes sold to customers (usually with a selling price).

IMPORTANT RULES:
1. The file structure can vary wildly - columns may be in any order, in Hebrew or English.
2. Each recipe/prep block typically has: a recipe name, yield quantity+unit, and a list of ingredients with quantity+unit. The recipe name is usually the single cell right above the "yield" or "ingredients" headers. If a prep recipe has no title, name it "Prep of " + the first ingredient name.
3. Normalize units to: unit/kg/gram/liter/ml/case.
4. Extract ONLY the recipes of type '${importType}'. Do NOT extract items/ingredients separately.
5. EXTRACT EVERY SINGLE RECIPE of type '${importType}'. Some files are long, process ALL of them.

Tab data:
${sheetData}
`;

        try {
          return await base44.integrations.Core.InvokeLLM({
            prompt,
            model: 'gemini_3_flash', // Faster model to avoid 504 timeout
            response_json_schema: {
              type: 'object',
              properties: {
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
                    required: ['name', 'ingredients']
                  }
                }
              }
            }
          });
        } catch (e) {
          console.error("Failed to parse sheet chunk", e);
          return null;
        }
      });
      
      for (const response of parsedResults) {
        if (!response) continue;
        if (response.recipes) {
          allRecipes.push(...response.recipes.map(r => ({...r, type: importType || r.type || 'sale_item'})));
        }
      }
    }

    const fetchWithFallback = async (entityType) => {
      let data = await base44.asServiceRole.entities[entityType].filter({ created_by: user.email }, 'name', 10000);
      
      let targetEmail = user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
      if (!user.store_user_owner_email) {
        try {
          const recs = await base44.asServiceRole.entities.StoreUser.filter({ user_email: user.email, is_active: true });
          if (recs.length > 0) targetEmail = recs[0].owner_email;
        } catch(e){}
      }

      if (targetEmail !== user.email) {
        const ownerData = await base44.asServiceRole.entities[entityType].filter({ created_by: targetEmail }, 'name', 10000);
        data = [...data, ...ownerData].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
      }

      if (user.chain_id && !user.is_chain_head) {
        try {
          const chain = await base44.asServiceRole.entities.Chain.filter({ id: user.chain_id });
          if (chain.length > 0) {
            const headEmail = chain[0].head_store_user_email;
            const headData = await base44.asServiceRole.entities[entityType].filter({ created_by: headEmail }, 'name', 10000);
            data = [...headData, ...data].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
          }
        } catch(e){}
      }

      // TEMP FOR ADMIN TESTING: If admin is testing on their own account, pull Kona's items for price reference
      if (user.role === 'admin' && targetEmail === user.email && entityType === 'Item') {
          const allItems = await base44.asServiceRole.entities.Item.filter({}, 'name', 10000);
          const konaItems = allItems.filter(i => i.created_by && i.created_by.toLowerCase().includes('kona'));
          data = [...data, ...konaItems].filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
      }

      return data;
    };

    // Fetch existing items to match ingredients
    const existingItems = await fetchWithFallback('Item');
    const itemMap = new Map(existingItems.map(it => [it.name.trim().toLowerCase(), it]));

    // We still need to create an Item for prep recipes if it doesn't exist, so they can be used as ingredients later.
    // Fetch default supplier
    const existingSuppliers = await fetchWithFallback('Supplier');
    const supplierMap = new Map(existingSuppliers.map(s => [s.name.trim().toLowerCase(), s]));
    let defaultSupplier = supplierMap.get('כללי') || supplierMap.get('general');
    if (!defaultSupplier) {
      defaultSupplier = await base44.entities.Supplier.create({ name: 'כללי', supplier_type: 'simple' });
      supplierMap.set('כללי', defaultSupplier);
    }

    const prepRecipeItemsToCreate = [];
    const prepRecipeItems = allRecipes.filter(r => r.type === 'prep_recipe').map(r => ({
      name: r.name,
      unit: normalizeUnit(r.yield_unit),
      price: 0, 
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
    const existingRecipes = await fetchWithFallback('Recipe');
    const recipeMap = new Map(existingRecipes.map(r => [r.name.trim().toLowerCase(), r]));

    // Calculate costs iteratively for prep recipes before inserting
    let costChanged = true;
    let passes = 0;
    while(costChanged && passes < 5) {
       costChanged = false;
       passes++;
       for (const r of allRecipes) {
           if (r.type === 'prep_recipe') {
               let totalCost = 0;
               for (const ing of (r.ingredients || [])) {
                   const itemNameLower = (ing.item_name || '').trim().toLowerCase();
                   let item = itemMap.get(itemNameLower);
                   if (!item) {
                       item = Array.from(itemMap.values()).find(i => {
                          if (!i.name) return false;
                          const n1 = itemNameLower.replace(/[^\p{L}\p{N}]/gu, '');
                          const n2 = i.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
                          if (n1 === n2) return true;
                          if (n1.length > 3 && n2.length > 3) return n1.includes(n2) || n2.includes(n1);
                          return false;
                       });
                   }
                   if (!item && mappedItems && mappedItems[itemNameLower]) {
                      const mappedId = mappedItems[itemNameLower];
                      item = Array.from(itemMap.values()).find(i => i.id === mappedId || (i.name && i.name.toLowerCase() === mappedId.toLowerCase()));
                   }
                   let multiplier = 1;
                   if (item && item.unit && ing.unit) {
                       const itemU = normalizeUnit(item.unit);
                       const ingU = normalizeUnit(ing.unit);
                       // We want to calculate the cost. 
                       // If the item in system is in KG, and recipe uses GRAMS, 1 gram = 1/1000 of the KG price.
                       if (itemU === 'kg' && ingU === 'gram') multiplier = 1/1000;
                       else if (itemU === 'gram' && ingU === 'kg') multiplier = 1000;
                       else if (itemU === 'liter' && ingU === 'ml') multiplier = 1/1000;
                       else if (itemU === 'ml' && ingU === 'liter') multiplier = 1000;
                   }
                   // If the user wrote 0.06 KG in the recipe, and the item is in KG, multiplier is 1. 0.06 * price * 1 works perfectly.
                   totalCost += (item ? Number(item.price_after_discount || item.price || 0) : 0) * (Number(ing.quantity) || 0) * multiplier;
               }
               const unitPrice = (Number(r.yield_quantity) || 1) > 0 ? (totalCost / Number(r.yield_quantity)) : totalCost;
               
               const pName = r.name.trim().toLowerCase();
               let pItem = itemMap.get(pName);
               if (pItem && Math.abs((pItem.price || 0) - unitPrice) > 0.001) {
                   pItem.price = unitPrice;
                   // Note: we update it in memory so it can be used in subsequent recipes calculation
                   costChanged = true;
               }
           }
       }
    }

    // Update the prep recipes items in the DB with the newly calculated prices
    for (const r of allRecipes) {
       if (r.type === 'prep_recipe') {
           const pName = r.name.trim().toLowerCase();
           const pItem = itemMap.get(pName);
           if (pItem && pItem.id && pItem.price > 0) {
               // Fire and forget updating the prep item price in DB
               base44.entities.Item.update(pItem.id, { price: pItem.price, price_after_discount: pItem.price }).catch(() => {});
           }
       }
    }

    // Process and save recipes
    const validRecipes = allRecipes.filter(r => r.name).map(r => {
      let totalCost = 0;
      const ingredients = (r.ingredients || []).map(ing => {
        const itemNameLower = (ing.item_name || '').trim().toLowerCase();
        // Try to find exact match, or partial match
        let item = itemMap.get(itemNameLower);
        if (!item) {
          item = Array.from(itemMap.values()).find(i => {
             if (!i.name) return false;
             const n1 = itemNameLower.replace(/[^\p{L}\p{N}]/gu, '');
             const n2 = i.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
             if (n1 === n2) return true;
             if (n1.length > 3 && n2.length > 3) {
               return n1.includes(n2) || n2.includes(n1);
             }
             return false;
          });
        }
        
        // If still not found, check if it was mapped by the user
        // (Mapping logic removed as user wants to upload items later)
        
        let multiplier = 1;
        if (item && item.unit && ing.unit) {
            const itemU = normalizeUnit(item.unit);
            const ingU = normalizeUnit(ing.unit);
            if (itemU === 'kg' && ingU === 'gram') multiplier = 1/1000;
            else if (itemU === 'gram' && ingU === 'kg') multiplier = 1000;
            else if (itemU === 'liter' && ingU === 'ml') multiplier = 1/1000;
            else if (itemU === 'ml' && ingU === 'liter') multiplier = 1000;
        }

        const cost = item ? (Number(item.price_after_discount || item.price || 0) * Number(ing.quantity) * multiplier) : 0;
        totalCost += cost;
        return {
          item_id: item ? item.id : null,
          item_name: ing.item_name,
          quantity: Number(ing.quantity) || 0,
          unit: normalizeUnit(ing.unit),
          cost: cost,
          unit_price: item ? (Number(item.price_after_discount || item.price || 0) * multiplier) : 0
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
    const recipeUpdateFns = [];

    for (const recipeData of validRecipes) {
      const existing = recipeMap.get(recipeData.name.trim().toLowerCase());
      if (existing) {
        // Update if changed
        const hasChanges = existing.sale_price !== recipeData.sale_price ||
                           existing.yield_quantity !== recipeData.yield_quantity ||
                           existing.yield_unit !== recipeData.yield_unit ||
                           JSON.stringify(existing.ingredients) !== JSON.stringify(recipeData.ingredients);
        if (hasChanges) {
          recipeUpdateFns.push(() => base44.entities.Recipe.update(existing.id, recipeData));
          updatedRecipesCount++;
        }
      } else {
        recipesToCreate.push(recipeData);
      }
    }
    
    if (recipeUpdateFns.length > 0) {
      await processSequentially(recipeUpdateFns, fn => fn());
    }

    if (recipesToCreate.length > 0) {
      const created = await base44.entities.Recipe.bulkCreate(recipesToCreate);
      createdRecipesCount = created.length;
    }

    return Response.json({ 
      success: true, 
      created_recipes_count: createdRecipesCount,
      updated_recipes_count: updatedRecipesCount,
      message: `Imported: ${createdRecipesCount} new recipes, ${updatedRecipesCount} updated recipes.`
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});