import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
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
            management_salary: 0.0,
            created_by: 'konaburgerltd@gmail.com' // Ensure it belongs to Kona Burgers
        };
        
        const existing = await base44.asServiceRole.entities.MonthlyDashboardData.filter({
            month: '2026-05',
            created_by: 'konaburgerltd@gmail.com'
        });
        
        let record;
        if (existing && existing.length > 0) {
            record = await base44.asServiceRole.entities.MonthlyDashboardData.update(existing[0].id, data);
        } else {
            record = await base44.asServiceRole.entities.MonthlyDashboardData.create(data);
        }
        
        return Response.json({ success: true, record });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});