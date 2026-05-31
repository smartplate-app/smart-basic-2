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
            const [
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
            ] = await Promise.all([
                base44.asServiceRole.entities.Order.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.SupplyReceipt.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Item.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Supplier.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.InventoryCount.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Worker.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.WeeklySchedule.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-week_start_date', 10000),
                base44.asServiceRole.entities.Recipe.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Warehouse.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.CogsReport.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.PriceChangeLog.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.WasteReport.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.MonthlyDashboardData.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-month', 10000)
            ]);

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
            const [
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
            ] = await Promise.all([
                base44.asServiceRole.entities.Order.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.SupplyReceipt.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Item.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Supplier.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.InventoryCount.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Worker.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.WeeklySchedule.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-week_start_date', 10000),
                base44.asServiceRole.entities.MonthlyDashboardData.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-month', 10000),
                base44.asServiceRole.entities.JobPosition.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Recipe.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.Warehouse.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.CogsReport.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.WasteReport.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000),
                base44.asServiceRole.entities.PriceChangeLog.filter({ $or: [{ created_by: userEmail }, { store_owner_email: userEmail }] }, '-created_date', 10000)
            ]);

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