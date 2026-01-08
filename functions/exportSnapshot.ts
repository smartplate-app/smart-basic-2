import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const entities = [
      'Supplier', 'Item', 'Order', 'SupplyReceipt', 'Warehouse', 'InventoryCount',
      'JobPosition', 'Worker', 'WeeklySchedule', 'PaymentTransaction', 'ScheduleTemplate',
      'MonthlyDashboardData', 'UserInvite', 'WeeklySalesPrediction', 'Chain', 'ChainStore',
      'StoreUser', 'WorkerRequest', 'ToDo', 'RestaurantUser', 'TipEntry', 'TipPolicy',
      'WorkerRate', 'InventoryTransfer', 'AccessRequest'
    ];

    const snapshot = {
      metadata: {
        generated_at: new Date().toISOString(),
        app_id: Deno.env.get('BASE44_APP_ID') || null,
        initiated_by: { email: user.email, name: user.full_name || null },
        entities_included: [] as string[],
        counts: {} as Record<string, number>
      },
      users: [] as any[],
      data: {} as Record<string, any[]>
    } as any;

    for (const name of entities) {
      try {
        const list = await (base44.asServiceRole as any).entities[name].list();
        snapshot.data[name] = list || [];
        snapshot.metadata.entities_included.push(name);
        snapshot.metadata.counts[name] = (list || []).length;
      } catch (e) {
        // Entity might not exist in this app; skip gracefully
      }
    }

    try {
      const users = await (base44.asServiceRole as any).entities.User.list();
      snapshot.users = (users || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name || null,
        email: u.email,
        role: u.role,
        created_date: u.created_date,
        updated_date: u.updated_date
      }));
      snapshot.metadata.counts['UserSnapshot'] = snapshot.users.length;
    } catch (_) {
      // If listing users fails for any reason, leave users empty
      snapshot.users = [];
    }

    return Response.json(snapshot);
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});