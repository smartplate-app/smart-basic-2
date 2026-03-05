import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { spreadsheetUrl } = await req.json();

        // Extract spreadsheet ID from URL
        const match = spreadsheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return Response.json({ success: false, error: 'Invalid Google Sheets URL' }, { status: 400 });
        }
        const spreadsheetId = match[1];

        const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

        // Fetch sheet metadata to get the first sheet's name
        const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!metaResponse.ok) {
            const errorData = await metaResponse.json();
            throw new Error(`Google Sheets API error: ${errorData.error?.message || metaResponse.statusText}`);
        }

        const metaData = await metaResponse.json();
        const sheetTitle = metaData.sheets[0].properties.title;

        // Fetch data from the sheet
        const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A1:Z100`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (!dataResponse.ok) {
            const errorData = await dataResponse.json();
            throw new Error(`Google Sheets API error: ${errorData.error?.message || dataResponse.statusText}`);
        }

        const data = await dataResponse.json();
        const rows = data.values || [];
        console.log("Rows:", JSON.stringify(rows));

        if (rows.length === 0) {
            return Response.json({ success: false, error: 'Sheet is empty' }, { status: 400 });
        }

        // Parse data based on the known structure
        // Row 1: ["Monthly Dashboard Report", "", "", "2026-03"]
        const month = rows[0][3];
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return Response.json({ success: false, error: 'Could not find a valid month (YYYY-MM) in cell D1' }, { status: 400 });
        }

        const parseCurrency = (val) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[^\d.-]/g, '')) || 0;
        };

        const parsePercent = (val) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[^\d.-]/g, '')) || 0;
        };

        let totalSales = 0;
        let laborCost = 0;
        let foodCost = 0;
        let predictedSales = 0;
        let laborGoalPercent = 25;
        let foodGoalPercent = 30;

        for (const row of rows) {
            if (!row[0]) continue;
            const label = row[0].toLowerCase();
            if (label.includes('total sales (incl. vat)')) {
                totalSales = parseCurrency(row[1]);
            } else if (label.includes('labor cost')) {
                laborCost = parseCurrency(row[1]);
            } else if (label.includes('food cost')) {
                foodCost = parseCurrency(row[1]);
            } else if (label.includes('predicted sales')) {
                predictedSales = parseCurrency(row[1]);
            } else if (label.includes('labor goal')) {
                laborGoalPercent = parsePercent(row[2]);
            } else if (label.includes('food goal')) {
                foodGoalPercent = parsePercent(row[2]);
            }
        }

        let hasLaborCost = false;
        let hasFoodCost = false;

        for (const row of rows) {
            if (!row[0]) continue;
            const label = row[0].toLowerCase();
            if (label.includes('labor cost')) hasLaborCost = true;
            if (label.includes('food cost')) hasFoodCost = true;
        }

        const dashboardData = {
            month,
            total_sales: totalSales,
            restaurant_sales: totalSales, // Assuming all sales are restaurant sales for simplicity if not split
            delivery_takeaway_sales: 0,
            manual_labor_cost: laborCost,
            use_manual_labor: hasLaborCost,
            manual_food_cost: foodCost,
            use_manual_food: hasFoodCost,
            predicted_sales: predictedSales,
            labor_goal_percent: laborGoalPercent,
            food_goal_percent: foodGoalPercent,
        };

        // Check if data for this month already exists
        const existingData = await base44.entities.MonthlyDashboardData.filter({ created_by: user.email, month });
        
        if (existingData && existingData.length > 0) {
            await base44.entities.MonthlyDashboardData.update(existingData[0].id, dashboardData);
        } else {
            await base44.entities.MonthlyDashboardData.create(dashboardData);
        }

        return Response.json({ success: true, month, data: dashboardData });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});