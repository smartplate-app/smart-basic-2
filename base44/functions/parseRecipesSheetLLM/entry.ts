import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

function parseSpreadsheetId(input) {
  if (!input) return null;
  const m = String(input).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : (input.length > 30 ? input : null);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { spreadsheetUrl, sheetName, importType } = body;
    const spreadsheetId = parseSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId || !sheetName) {
      return Response.json({ error: 'Missing spreadsheetUrl or sheetName' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    const range = `'${sheetName}'!A1:Z1000`;
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!getRes.ok) {
      const errBody = await getRes.text();
      return Response.json({ error: 'Failed to read sheet data: ' + errBody }, { status: 500 });
    }
    
    const data = await getRes.json();
    const rows = data.values || [];
    if (rows.length < 2) {
      return Response.json({ success: true, recipes: [] });
    }
    
    const sheetData = `\n\n--- גיליון: ${sheetName} ---\n` + JSON.stringify(rows.slice(0, 1000));

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

    const parsedResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
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

    // Force all recipes to have the correct type based on importType
    const finalRecipes = (parsedResponse.recipes || []).map(r => ({
      ...r,
      type: importType || r.type || 'sale_item'
    }));

    return Response.json({
      success: true,
      recipes: finalRecipes
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});