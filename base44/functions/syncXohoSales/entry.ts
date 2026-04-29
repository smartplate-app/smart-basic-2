import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // 1. Log into Tabit API (this simulates the UI login at chef-app.tabit.cloud)
    const loginRes = await fetch('https://ros-rp-beta.tabit.cloud/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cafe.xoho@gmail.com', password: 'xohoby3090' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.statusText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.il?.access_token || loginData.access_token;
    
    if (!token) {
      throw new Error('Access token not found in login response');
    }
    
    // 2. Change organization to get branch token
    const orgRes = await fetch('https://ros-rp-beta.tabit.cloud/Organizations/63035a31caa0286ffe6a0db3/change', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orgRes.ok) {
      throw new Error(`Org change failed: ${orgRes.statusText}`);
    }
    
    const orgData = await orgRes.json();
    const branchToken = orgData.access_token || token;
    
    // 3. Get MTD sales from daily-totals report
    const reportsRes = await fetch('https://ros-rp-beta.tabit.cloud/reports/daily-totals', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${branchToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!reportsRes.ok) {
      throw new Error(`Reports fetch failed: ${reportsRes.statusText}`);
    }
    
    const reportsData = await reportsRes.json();
    const totalIncTax = reportsData.totals?.currentMonth?.totalIncTax || 0;
    const totalExTax = reportsData.totals?.currentMonth?.totalExTax || 0;
    
    // 4. Update the MonthlyDashboardData record for the current month where monthly_rent_incl_vat = 10500
    // We use the service role here to query and update the database safely
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const dashboards = await base44.asServiceRole.entities.MonthlyDashboardData.filter({
      month: currentMonth,
      monthly_rent_incl_vat: 10500
    });
    
    if (dashboards.length > 0) {
      // Update the first matching dashboard
      await base44.asServiceRole.entities.MonthlyDashboardData.update(dashboards[0].id, {
        total_sales: totalIncTax,
        restaurant_sales: totalExTax
      });
    }
    
    return Response.json({
      success: true,
      sales: {
        vat_amount: totalIncTax,
        net_amount: totalExTax
      },
      dashboardsUpdated: dashboards.length
    });
    
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});