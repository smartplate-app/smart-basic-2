import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { screenshot_urls, warehouse_id, language = 'he' } = body;

        if (!screenshot_urls || screenshot_urls.length === 0) {
            return Response.json({ error: 'No screenshot URLs provided' }, { status: 400 });
        }

        console.log('[processCountScreenshots] Processing', screenshot_urls.length, 'screenshots');

        const prompt = language === 'he' 
            ? `אתה מערכת חכמה לעיבוד ספירת מלאי. 
            
קרא בקפידה את התמונות המצורפות וחלץ את כל הפריטים שמופיעים בהן.

המבנה של הטבלה:
- **עמודה ראשונה (שמאל)**: שם הפריט
- **עמודה אמצעית (מרכז)**: מחיר - זה המספר תحת הכותרת "מחיר" 
- **עמודה ימנית (ימין)**: כמות במלאי - זה המספר תחת הכותרת "כמות במלאי" או "כמות"

חשוב מאוד:
- קרא את כותרות העמודות בטבלה
- העמודה המסומנת "מחיר" - זה המחיר (בדרך כלל מספרים גדולים יותר)
- העמודה המסומנת "כמות במלאי" או "כמות" - זו הכמות (בדרך כלל מספרים קטנים יותר, עשרוניים)
- שים לב למיקום העמודות: שם, מחיר, כמות (משמאל לימין)

לכל פריט (שורה בטבלה), חלץ:
1. שם הפריט - מהעמודה הראשונה (שמאל)
2. המחיר ליחידה - מהעמודה האמצעית ("מחיר")
3. הכמות - מהעמודה הימנית ("כמות במלאי")
4. יחידה - נסה לזהות מתוך שם הפריט (ליטר, ק"ג, יחידה)

החזר JSON עם מערך items, כאשר כל פריט מכיל:
{
  "item_name": "שם הפריט",
  "counted_quantity": מספר (מהעמודה הימנית - כמות),
  "unit": "kg/liter/unit/case",
  "price_per_unit": מספר (מהעמודה האמצעית - מחיר),
  "notes": "הערות"
}`
            : `You are a smart inventory counting system.

Carefully read the attached images and extract all items that appear in them.

The table structure:
- **First column (left)**: Item name
- **Middle column (center)**: Price - the number under the header "מחיר" (price)
- **Right column (right)**: Quantity in stock - the number under the header "כמות במלאי" or "כמות" (quantity)

Very important:
- Read the column headers in the table
- The column labeled "מחיר" - that's the price (usually larger numbers)
- The column labeled "כמות במלאי" or "כמות" - that's the quantity (usually smaller, decimal numbers)
- Pay attention to column position: name, price, quantity (left to right)

For each item (row in the table), extract:
1. Item name - from the first column (left)
2. Price per unit - from the middle column ("מחיר")
3. Quantity - from the right column ("כמות במלאי")
4. Unit - try to identify from the item name (liter, kg, unit)

Return JSON with items array, where each item contains:
{
  "item_name": "Item name",
  "counted_quantity": number (from right column - quantity),
  "unit": "kg/liter/unit/case",
  "price_per_unit": number (from middle column - price),
  "notes": "notes"
}`;

        const response_schema = {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            item_name: { type: "string" },
                            counted_quantity: { type: "number" },
                            unit: { type: "string" },
                            price_per_unit: { type: "number" },
                            notes: { type: "string" }
                        },
                        required: ["item_name", "counted_quantity", "unit", "price_per_unit"]
                    }
                }
            },
            required: ["items"]
        };

        console.log('[processCountScreenshots] Calling LLM with', screenshot_urls.length, 'images');

        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            file_urls: screenshot_urls,
            response_json_schema: response_schema
        });

        console.log('[processCountScreenshots] LLM response:', llmResponse);

        if (!llmResponse.items || llmResponse.items.length === 0) {
            return Response.json({ 
                error: language === 'he' 
                    ? 'לא נמצאו פריטים בתמונות. אנא וודא שהתמונות ברורות וקריאות.'
                    : 'No items found in images. Please ensure images are clear and readable.'
            }, { status: 400 });
        }

        // Validate and clean the data
        const validatedItems = llmResponse.items.map(item => ({
            item_id: '',
            item_name: item.item_name || 'Unknown Item',
            counted_quantity: parseFloat(item.counted_quantity) || 0,
            unit: item.unit || 'unit',
            price_per_unit: parseFloat(item.price_per_unit) || 0,
            total_cost: 0, // Will be calculated on frontend
            notes: item.notes || ''
        }));

        console.log('[processCountScreenshots] Returning', validatedItems.length, 'validated items');

        return Response.json({
            items: validatedItems,
            total_items: validatedItems.length
        });

    } catch (error) {
        console.error('[processCountScreenshots] Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to process screenshots',
            stack: error.stack
        }, { status: 500 });
    }
});