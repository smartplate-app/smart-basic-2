import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const data = {
            manual_labor_cost: 20560.0,
            use_manual_food: false,
            notes: null,
            use_manual_labor: true,
            delivery_takeaway_sales: 4277.0,
            total_tips: 0,
            monthly_rent_incl_vat: 17000.0,
            month: '2026-05',
            manual_food_cost: 0.0,
            predicted_sales: 314718.0,
            food_goal_percent: 30.0,
            restaurant_sales: 23760.0,
            labor_goal_percent: 25.0,
            total_sales: 28037.0,
            management_salary: 0.0
        };
        
        // Use the user's API key
        const response = await fetch('https://base44.app/api/apps/699c4d19592434b7f867b2c6/entities/MonthlyDashboardData', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 3386286763ba4e91bba49cd7a75e7de5'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API returned ${response.status}: ${errText}`);
        }
        
        const record = await response.json();
        
        return Response.json({ success: true, record });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});