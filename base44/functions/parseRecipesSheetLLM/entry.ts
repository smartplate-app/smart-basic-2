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
    const { spreadsheetUrl, sheetName } = body;
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
      return Response.json({ success: true, items: [], recipes: [] });
    }
    
    const sheetData = `\n\n--- גיליון: ${sheetName} ---\n` + JSON.stringify(rows.slice(0, 1000));

    const prompt = `You are parsing a restaurant Google Sheets file into structured JSON.

The file has multiple tabs, you are now parsing a specific tab.
1. Ingredients/Items tabs (e.g. "מרכיבים", "חומרי גלם", "Items", "Ingredients") contain lists of raw materials with prices.
2. Prep Recipes tabs (e.g. "הכנות", "Preps") contain recipes that yield a batch of an ingredient (e.g. 1kg of sauce). type: 'prep_recipe'.
3. Sale Items / Menu tabs (e.g. "מתכונים", "מנות", "Menu", "Recipes") contain recipes for dishes sold to customers. type: 'sale_item'.

If a tab name is ambiguous, infer the type based on the content (if it yields a batch like "1 kg" or "2 liter", it's likely a prep_recipe. If it has a selling price, it's a sale_item).

IMPORTANT RULES:
1. The file structure can vary wildly - columns may be in any order, in Hebrew or English.
2. If NO ingredients tab exists, extract ingredient names only from the recipe/prep tabs.
3. Each recipe/prep block typically has: a recipe name, yield quantity+unit, and a list of ingredients with quantity+unit. The recipe name is usually the single cell right above the "yield" or "ingredients" headers. If a prep recipe has no title, name it "Prep of " + the first ingredient name.
4. Preps → type: 'prep_recipe'. Sale items → type: 'sale_item'.
5. If a sale_item uses a prep_recipe as ingredient, use the prep_recipe name as item_name.
6. If ingredients tab exists: extract ALL items into the items array with name, unit, price, supplier_name.
7. Normalize units to: unit/kg/gram/liter/ml/case.
8. EXTRACT EVERY SINGLE RECIPE, PREP RECIPE, AND ITEM. DO NOT SKIP ANY. Some files are long, process ALL of them.
9. Use the EXACT ingredient names from the items list whenever possible to avoid missing items. If a recipe says 'flour 1kg' but the item is 'flour', use 'flour' as the item_name.
10. Ensure you capture the "Preps" / "הכנות" tab completely. Look for any standalone text cells above tables - those are the Recipe Names! If there really is no name at all, use "הכנה: " + the first ingredient name.

Tab data:
${sheetData}
`;

    const parsedResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
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

    return Response.json({
      success: true,
      items: parsedResponse.items || [],
      recipes: parsedResponse.recipes || []
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});