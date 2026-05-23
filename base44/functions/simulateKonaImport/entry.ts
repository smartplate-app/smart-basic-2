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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { spreadsheetUrl } = await req.json();
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) return Response.json({ error: 'Missing spreadsheetId/url' }, { status: 400 });

    // 1. Get Kona's Items
    // We'll fetch all items and filter by those created by Kona's email
    let konaItems = await base44.asServiceRole.entities.Item.filter({}, 'name', 5000);
    konaItems = konaItems.filter(i => i.created_by && i.created_by.toLowerCase().includes('kona'));
    
    if (konaItems.length === 0) {
      return Response.json({ error: 'Could not find Kona items' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!metaRes.ok) {
      const errTxt = await metaRes.text();
      return Response.json({ error: 'Failed to read spreadsheet metadata', details: errTxt }, { status: 500 });
    }
    const metaData = await metaRes.json();
    const sheetNames = metaData.sheets.map(s => s.properties.title);

    let allRowsData = "";
    for (const sheetName of sheetNames) {
      const range = `'${sheetName}'!A1:Z1000`;
      const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!getRes.ok) continue;
      const data = await getRes.json();
      const rows = data.values || [];
      if (rows.length < 2) continue;
      allRowsData += `\n\n--- גיליון: ${sheetName} ---\n` + JSON.stringify(rows.slice(0, 1000));
    }

    const prompt = `You are parsing a restaurant Google Sheets file into structured JSON.
EXTRACT EVERY SINGLE RECIPE, PREP RECIPE, AND ITEM.
Preps -> type: 'prep_recipe'. Sale items -> type: 'sale_item'.
Tab data:
${allRowsData}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, unit: { type: 'string' }, price: { type: 'number' } }, required: ['name'] } },
          recipes: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, yield_quantity: { type: 'number' }, yield_unit: { type: 'string' }, sale_price: { type: 'number' }, ingredients: { type: 'array', items: { type: 'object', properties: { item_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' } }, required: ['item_name', 'quantity'] } } }, required: ['name', 'type', 'ingredients'] } }
        }
      }
    });

    let allRecipes = response.recipes || [];
    
    // Simulate cost calculation
    const itemMap = new Map(konaItems.map(it => [it.name.trim().toLowerCase(), it]));

    const calculatedRecipes = allRecipes.map(r => {
      let totalCost = 0;
      const calculatedIngredients = (r.ingredients || []).map(ing => {
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
          original_name: ing.item_name,
          matched_item_name: item ? item.name : 'NOT FOUND',
          matched_item_price_per_unit: item ? Number(item.price_after_discount || item.price || 0) : 0,
          system_unit: item ? item.unit : null,
          recipe_qty: Number(ing.quantity),
          recipe_unit: ing.unit,
          multiplier: multiplier,
          calculated_cost: cost
        };
      });

      return {
        recipe_name: r.name,
        type: r.type,
        total_cost: totalCost,
        ingredients: calculatedIngredients
      };
    });

    return Response.json({
      success: true,
      kona_items_count: konaItems.length,
      calculated_recipes: calculatedRecipes
    });

  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});