import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch external dashboard HTML
    const res = await fetch("https://rosa-6d8ebb9e.base44.app/functions/grDashboard");
    if (!res.ok) {
       throw new Error("Failed to fetch dashboard: " + res.status);
    }
    const html = await res.text();
    
    // Isolate the MTD section to save tokens and ensure accuracy
    const mtdSplit = html.split('MTD —');
    let mtdText = mtdSplit.length > 1 ? mtdSplit[mtdSplit.length - 1] : html;
    if (mtdText.length > 3500) mtdText = mtdText.slice(0, 3500);

    // Use LLM to extract the data reliably regardless of HTML structure changes
    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
       prompt: "Extract the MTD (Month-To-Date) financial data from this HTML snippet. Return ONLY the JSON object. We need:\n- restaurant_sales (from 'מכירות ברוטו')\n- total_tips (from 'טיפים')\n- manual_food_cost (from 'עלות מזון נטו')\n- manual_labor_cost (from 'עלות שכר יחסית (MTD אמיתי)').\nIf one is missing, fallback to 0. Extract numbers without commas or currency symbols.\n\n" + mtdText,
       response_json_schema: {
           type: "object",
           properties: {
               restaurant_sales: { type: "number" },
               total_tips: { type: "number" },
               manual_food_cost: { type: "number" },
               manual_labor_cost: { type: "number" }
           },
           required: ["restaurant_sales", "total_tips", "manual_food_cost", "manual_labor_cost"]
       }
    });

    const data = llmResult;
    if (!data || typeof data.restaurant_sales !== 'number') {
        throw new Error("Failed to parse data properly: " + JSON.stringify(data));
    }

    // Get current month based on Israel time
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit' });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const currentMonth = `${year}-${month}`;
    
    const ownerEmail = 'guestroom@smartplate.org';
    
    // Check if the record for the current month exists
    const existing = await base44.asServiceRole.entities.MonthlyDashboardData.filter({ 
        created_by: ownerEmail, 
        month: currentMonth 
    });
    
    if (existing.length > 0) {
        await base44.asServiceRole.entities.MonthlyDashboardData.update(existing[0].id, {
            restaurant_sales: data.restaurant_sales,
            total_sales: data.restaurant_sales,
            total_tips: data.total_tips,
            manual_food_cost: data.manual_food_cost,
            manual_labor_cost: data.manual_labor_cost,
            use_manual_food: true,
            use_manual_labor: true,
            notes: 'Auto-synced MTD from grDashboard at ' + new Date().toLocaleString('he-IL', {timeZone: 'Asia/Jerusalem'})
        });
    } else {
        await base44.asServiceRole.entities.MonthlyDashboardData.create({
            created_by: ownerEmail,
            store_owner_email: ownerEmail,
            month: currentMonth,
            restaurant_sales: data.restaurant_sales,
            total_sales: data.restaurant_sales,
            total_tips: data.total_tips,
            manual_food_cost: data.manual_food_cost,
            manual_labor_cost: data.manual_labor_cost,
            use_manual_food: true,
            use_manual_labor: true,
            notes: 'Auto-synced MTD from grDashboard at ' + new Date().toLocaleString('he-IL', {timeZone: 'Asia/Jerusalem'}),
            food_goal_percent: 30,
            labor_goal_percent: 25,
            management_salary: 0,
            monthly_rent_incl_vat: 0,
            delivery_takeaway_sales: 0,
            predicted_sales: 0
        });
    }

    return Response.json({ success: true, month: currentMonth, data });
  } catch (error) {
    console.error("Sync error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});