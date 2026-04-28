import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export async function performSync(base44, connection) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const startOfMonth = `${currentMonth}-01`;
  const endOfMonth = `${currentMonth}-31`;
  let restaurant_sales = 0;
  let delivery_takeaway_sales = 0;
  let total_sales = 0;

  if (connection.pos_type === 'beecomm') {
    const authRes = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCWThH_TX19GrAxoH7zBLE6OzSx2n1Erps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: connection.beecomm_email, password: connection.beecomm_password, returnSecureToken: true })
    });
    const authData = await authRes.json();
    if (!authData.idToken) throw new Error('Beecomm auth failed: ' + (authData.error?.message || 'Unknown error'));

    const salesRes = await fetch('https://20cs5hma71.execute-api.eu-west-1.amazonaws.com/prod/api/postOtherDB', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authData.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: "zEntry",
        pipeline: [{ $match: { valueDate: { $gte: startOfMonth, $lte: endOfMonth } } }]
      })
    });
    const salesData = await salesRes.json();
    const entries = Array.isArray(salesData) ? salesData : (salesData.data || []);
    entries.forEach(z => {
      restaurant_sales += (z.totalSales || z.grossSales || 0);
    });
    total_sales = restaurant_sales;
  } else if (connection.pos_type === 'tabit') {
    const authRes = await fetch('https://chef-app.tabit.cloud/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: connection.tabit_email, password: connection.tabit_password })
    });
    const authData = await authRes.json();
    const token = authData.il?.access_token || authData.access_token;
    if (!token) throw new Error('Tabit auth failed');

    const branches = connection.tabit_branches || [];
    const today = new Date();
    for (const orgId of branches) {
      const orgRes = await fetch(`https://ros-rp-beta.tabit.cloud/Organizations/${orgId}/change`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      const orgData = await orgRes.json();
      const branchToken = orgData.access_token || token;

      for (let day = 1; day <= today.getDate(); day++) {
        const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
        const repRes = await fetch(`https://ros-rp-beta.tabit.cloud/reports/daily-totals?businessDate=${dateStr}`, {
          headers: { 'Authorization': `Bearer ${branchToken}` }
        });
        if (repRes.ok) {
          const repData = await repRes.json();
          restaurant_sales += (repData.netSales || 0) / 100;
        }
      }
    }
    total_sales = restaurant_sales;
  }

  const dashboards = await base44.asServiceRole.entities.MonthlyDashboardData.filter({ created_by: connection.created_by, month: currentMonth });
  if (dashboards.length > 0) {
    await base44.asServiceRole.entities.MonthlyDashboardData.update(dashboards[0].id, {
      restaurant_sales, total_sales
    });
  } else {
    await base44.asServiceRole.entities.MonthlyDashboardData.create({
      created_by: connection.created_by,
      month: currentMonth, restaurant_sales, total_sales
    });
  }

  await base44.asServiceRole.entities.POSConnection.update(connection.id, {
    last_synced: new Date().toISOString()
  });

  return { restaurant_sales, total_sales };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const connections = await base44.entities.POSConnection.filter({ created_by: user.email, is_active: true });
    if (!connections || connections.length === 0) return Response.json({ success: false, error: 'No active POS connection' });

    const result = await performSync(base44, connections[0]);
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
});