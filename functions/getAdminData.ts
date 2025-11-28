import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
                schedules
            ] = await Promise.all([
                base44.asServiceRole.entities.Order.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.SupplyReceipt.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.Item.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.Supplier.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.InventoryCount.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.Worker.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.WeeklySchedule.filter({ created_by: userEmail })
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
                    schedules
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
                positions
            ] = await Promise.all([
                base44.asServiceRole.entities.Order.filter({ created_by: userEmail }, '-created_date'),
                base44.asServiceRole.entities.SupplyReceipt.filter({ created_by: userEmail }, '-created_date'),
                base44.asServiceRole.entities.Item.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.Supplier.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.InventoryCount.filter({ created_by: userEmail }, '-created_date'),
                base44.asServiceRole.entities.Worker.filter({ created_by: userEmail }),
                base44.asServiceRole.entities.WeeklySchedule.filter({ created_by: userEmail }, '-week_start_date'),
                base44.asServiceRole.entities.MonthlyDashboardData.filter({ created_by: userEmail }, '-month'),
                base44.asServiceRole.entities.JobPosition.filter({ created_by: userEmail })
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
                    positions
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