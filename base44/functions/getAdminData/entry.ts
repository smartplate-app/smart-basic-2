import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';


Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { action, userEmail } = await req.json();

        if (action === 'listUsers') {
            const users = await base44.asServiceRole.entities.User.list();
            return Response.json({ success: true, users });
        }

        if (action === 'getUserData' && userEmail) {
            const q = { $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] };
            const orders = await base44.asServiceRole.entities.Order.filter(q, '-created_date', 10000);
            const receipts = await base44.asServiceRole.entities.SupplyReceipt.filter(q, '-created_date', 10000);
            const items = await base44.asServiceRole.entities.Item.filter(q, '-created_date', 10000);
            const suppliers = await base44.asServiceRole.entities.Supplier.filter(q, '-created_date', 10000);
            const inventory = await base44.asServiceRole.entities.InventoryCount.filter(q, '-created_date', 10000);
            const workers = await base44.asServiceRole.entities.Worker.filter(q, '-created_date', 10000);
            const schedules = await base44.asServiceRole.entities.WeeklySchedule.filter(q, '-week_start_date', 10000);
            const recipes = await base44.asServiceRole.entities.Recipe.filter(q, '-created_date', 10000);
            const warehouses = await base44.asServiceRole.entities.Warehouse.filter(q, '-created_date', 10000);
            const cogsReports = await base44.asServiceRole.entities.CogsReport.filter(q, '-created_date', 10000);
            const priceChanges = await base44.asServiceRole.entities.PriceChangeLog.filter(q, '-created_date', 10000);
            const wasteReports = await base44.asServiceRole.entities.WasteReport.filter(q, '-created_date', 10000);
            const monthlyDashboardData = await base44.asServiceRole.entities.MonthlyDashboardData.filter(q, '-month', 10000);

            return Response.json({
                success: true,
                data: {
                    orders,
                    receipts,
                    items,
                    suppliers,
                    inventory,
                    workers,
                    schedules,
                    recipes,
                    warehouses,
                    cogsReports,
                    priceChanges,
                    wasteReports,
                    monthlyDashboardData
                }
            });
        }

        if (action === 'getFullUserData' && userEmail) {
            const q = { $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] };
            const orders = await base44.asServiceRole.entities.Order.filter(q, '-created_date', 10000);
            const receipts = await base44.asServiceRole.entities.SupplyReceipt.filter(q, '-created_date', 10000);
            const items = await base44.asServiceRole.entities.Item.filter(q, '-created_date', 10000);
            const suppliers = await base44.asServiceRole.entities.Supplier.filter(q, '-created_date', 10000);
            const inventory = await base44.asServiceRole.entities.InventoryCount.filter(q, '-created_date', 10000);
            const workers = await base44.asServiceRole.entities.Worker.filter(q, '-created_date', 10000);
            const schedules = await base44.asServiceRole.entities.WeeklySchedule.filter(q, '-week_start_date', 10000);
            const dashboardData = await base44.asServiceRole.entities.MonthlyDashboardData.filter(q, '-month', 10000);
            const positions = await base44.asServiceRole.entities.JobPosition.filter(q, '-created_date', 10000);
            const recipes = await base44.asServiceRole.entities.Recipe.filter(q, '-created_date', 10000);
            const warehouses = await base44.asServiceRole.entities.Warehouse.filter(q, '-created_date', 10000);
            const cogsReports = await base44.asServiceRole.entities.CogsReport.filter(q, '-created_date', 10000);
            const wasteReports = await base44.asServiceRole.entities.WasteReport.filter(q, '-created_date', 10000);
            const priceChanges = await base44.asServiceRole.entities.PriceChangeLog.filter(q, '-created_date', 10000);

            return Response.json({
                success: true,
                data: {
                    orders,
                    receipts,
                    items,
                    suppliers,
                    inventory,
                    workers,
                    schedules,
                    dashboardData,
                    positions,
                    recipes,
                    warehouses,
                    cogsReports,
                    wasteReports,
                    priceChanges
                }
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error in getAdminData:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});