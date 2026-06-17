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

        const fetchBoth = async (entityName, sortBy = '-created_date') => {
            const [r1, r2] = await Promise.all([
                base44.asServiceRole.entities[entityName].filter({ created_by: userEmail }, sortBy, 10000),
                base44.asServiceRole.entities[entityName].filter({ store_owner_email: userEmail }, sortBy, 10000)
            ]);
            const combined = [...(r1 || []), ...(r2 || [])];
            const deduped = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            if (entityName === 'Warehouse') return deduped.filter(w => w.is_active !== false);
            return deduped;
        };

        if (action === 'getUserData' && userEmail) {
            const [
                orders, receipts, items, suppliers, inventory, workers, schedules,
                recipes, warehouses, cogsReports, priceChanges, wasteReports, monthlyDashboardData
            ] = await Promise.all([
                fetchBoth('Order'),
                fetchBoth('SupplyReceipt'),
                fetchBoth('Item'),
                fetchBoth('Supplier'),
                fetchBoth('InventoryCount'),
                fetchBoth('Worker'),
                fetchBoth('WeeklySchedule', '-week_start_date'),
                fetchBoth('Recipe'),
                fetchBoth('Warehouse'),
                fetchBoth('CogsReport'),
                fetchBoth('PriceChangeLog'),
                fetchBoth('WasteReport'),
                fetchBoth('MonthlyDashboardData', '-month')
            ]);

            return Response.json({
                success: true,
                data: {
                    orders, receipts, items, suppliers, inventory, workers, schedules,
                    recipes, warehouses, cogsReports, priceChanges, wasteReports, monthlyDashboardData
                }
            });
        }

        if (action === 'getFullUserData' && userEmail) {
            const [
                orders, receipts, items, suppliers, inventory, workers, schedules,
                dashboardData, positions, recipes, warehouses, cogsReports, wasteReports, priceChanges
            ] = await Promise.all([
                fetchBoth('Order'),
                fetchBoth('SupplyReceipt'),
                fetchBoth('Item'),
                fetchBoth('Supplier'),
                fetchBoth('InventoryCount'),
                fetchBoth('Worker'),
                fetchBoth('WeeklySchedule', '-week_start_date'),
                fetchBoth('MonthlyDashboardData', '-month'),
                fetchBoth('JobPosition'),
                fetchBoth('Recipe'),
                fetchBoth('Warehouse'),
                fetchBoth('CogsReport'),
                fetchBoth('WasteReport'),
                fetchBoth('PriceChangeLog')
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