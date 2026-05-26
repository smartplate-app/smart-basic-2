import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportType, month, data } = await req.json();

    // Get Google Sheets access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlesheets");

    // Create a new spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `${reportType} - ${month} - ${new Date().toISOString()}`
        },
        sheets: [{
          properties: {
            title: reportType === 'monthly' ? 'Monthly Report' : 'Tips Report'
          }
        }]
      })
    });

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Prepare data rows
    let values = [];
    if (reportType === 'monthly') {
      values = [
        ['Monthly Dashboard Report', '', '', month],
        [],
        ['Metric', 'Value', 'Percentage', 'Notes'],
        ['Total Sales (incl. VAT)', `₪${data.actualSales}`, '', ''],
        ['Sales (excl. VAT)', `₪${data.actualSalesExVAT}`, '', ''],
        ['Labor Cost', `₪${data.laborCost}`, `${data.laborPercent}%`, 'From schedules'],
        ['Food Cost', `₪${data.foodCost}`, `${data.foodPercent}%`, 'From receipts'],
        ['Combined Cost', `₪${data.combinedCost}`, `${data.combinedPercent}%`, ''],
        [],
        ['Goals', '', '', ''],
        ['Predicted Sales', `₪${data.predictedSales}`, '', ''],
        ['Labor Goal', `₪${data.laborGoalAmount}`, `${data.laborGoalPercent}%`, ''],
        ['Food Goal', `₪${data.foodGoalAmount}`, `${data.foodGoalPercent}%`, ''],
      ];
    } else if (reportType === 'tips') {
      values = [
        ['Tips Report', '', month],
        [],
        ['Summary', '', ''],
        ['Total Tips', `₪${data.totalTips}`, ''],
        ['Total Sales', `₪${data.totalSales}`, ''],
        ['Tips %', `${data.tipPercentage}%`, ''],
        ['Active Workers', data.workerCount, ''],
        [],
        ['Worker', 'Total Tips', 'Shifts'],
        ...data.workers.map(w => [w.name, `₪${w.total}`, w.shifts])
      ];
    }

    // Update the sheet with data
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: values
      })
    });

    // Share with store managers and active users
    try {
      await base44.functions.invoke('shareSheetWithManagers', { spreadsheetId });
    } catch(e) {
      console.error('Failed to share sheet with managers:', e);
    }

    return Response.json({ 
      success: true, 
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    });

  } catch (error) {
    console.error("Error exporting to Google Sheets:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});