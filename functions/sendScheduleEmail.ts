
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { scheduleId, additionalEmail, language } = body;

    console.log("Sending schedule email:", { scheduleId, additionalEmail, language, userEmail: user.email });

    if (!scheduleId) {
      return Response.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    // Get the schedule using service role
    const schedule = await base44.asServiceRole.entities.WeeklySchedule.get(scheduleId);
    
    if (!schedule) {
      console.error("Schedule not found:", scheduleId);
      return Response.json({ error: 'Schedule not found' }, { status: 404 });
    }

    console.log("Schedule found:", schedule.week_start_date);

    // Calculate totals
    const totalHours = schedule.total_hours || 0;
    const totalCost = schedule.total_cost || 0;
    const laborPercentage = schedule.labor_cost_percentage || 0;
    const predictedSales = schedule.predicted_weekly_sales || 0;

    // Format the date
    const weekStart = new Date(schedule.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formatDate = (date) => {
      return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };

    // Group shifts by day
    const shiftsByDay = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    (schedule.shifts || []).forEach(shift => {
      if (shiftsByDay[shift.day]) {
        shiftsByDay[shift.day].push(shift);
      }
    });

    const dayNames = {
      he: {
        monday: 'שני',
        tuesday: 'שלישי',
        wednesday: 'רביעי',
        thursday: 'חמישי',
        friday: 'שישי',
        saturday: 'שבת',
        sunday: 'ראשון'
      },
      en: {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday'
      }
    };

    const t = language === 'he' ? {
      title: 'לוח משמרות שבועי',
      week: 'שבוע',
      totalHours: 'סה"כ שעות',
      totalCost: 'עלות כוללת',
      laborPercentage: 'אחוז עבודה',
      predictedSales: 'מכירות חזויות',
      worker: 'עובד',
      position: 'תפקיד',
      hours: 'שעות',
      cost: 'עלות',
      noShifts: 'אין משמרות',
      summary: 'סיכום',
      excludingVAT: 'ללא מע"מ'
    } : {
      title: 'Weekly Schedule',
      week: 'Week',
      totalHours: 'Total Hours',
      totalCost: 'Total Cost',
      laborPercentage: 'Labor %',
      predictedSales: 'Predicted Sales',
      worker: 'Worker',
      position: 'Position',
      hours: 'Hours',
      cost: 'Cost',
      noShifts: 'No shifts',
      summary: 'Summary',
      excludingVAT: 'Excluding VAT'
    };

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };

    // Create HTML email
    const emailHTML = `
<!DOCTYPE html>
<html dir="${language === 'he' ? 'rtl' : 'ltr'}" lang="${language === 'he' ? 'he' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      direction: ${language === 'he' ? 'rtl' : 'ltr'};
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: ${language === 'he' ? 'right' : 'left'};
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .summary h2 {
      margin-top: 0;
      color: #667eea;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 20px;
    }
    .summary-item {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border-${language === 'he' ? 'right' : 'left'}: 4px solid #667eea;
    }
    .summary-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    .day-section {
      margin-bottom: 30px;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
    }
    .day-header {
      background: #667eea;
      color: white;
      padding: 15px 20px;
      font-weight: bold;
      font-size: 18px;
      text-align: ${language === 'he' ? 'right' : 'left'};
    }
    .shift-table {
      width: 100%;
      border-collapse: collapse;
    }
    .shift-table th {
      background: #f8f9fa;
      padding: 12px;
      text-align: ${language === 'he' ? 'right' : 'left'};
      font-weight: 600;
      border-bottom: 2px solid #e0e0e0;
    }
    .shift-table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      text-align: ${language === 'he' ? 'right' : 'left'};
    }
    .shift-table tr:last-child td {
      border-bottom: none;
    }
    .no-shifts {
      padding: 20px;
      text-align: center;
      color: #999;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    @media (max-width: 600px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${t.title}</h1>
      <p>${t.week}: ${formatDate(weekStart)} - ${formatDate(weekEnd)}</p>
    </div>
    
    <div class="content">
      <div class="summary">
        <h2>${t.summary}</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">${t.totalHours}</div>
            <div class="summary-value">${totalHours.toFixed(1)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t.totalCost}</div>
            <div class="summary-value">${formatCurrency(totalCost)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t.predictedSales} (${t.excludingVAT})</div>
            <div class="summary-value">${formatCurrency(predictedSales / 1.18)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">${t.laborPercentage}</div>
            <div class="summary-value">${laborPercentage.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      ${Object.entries(dayNames[language === 'he' ? 'he' : 'en']).map(([dayKey, dayLabel]) => {
        const dayShifts = shiftsByDay[dayKey] || [];
        
        return `
          <div class="day-section">
            <div class="day-header">${dayLabel}</div>
            ${dayShifts.length > 0 ? `
              <table class="shift-table">
                <thead>
                  <tr>
                    <th>${t.worker}</th>
                    <th>${t.position}</th>
                    <th>${t.hours}</th>
                    <th>${t.cost}</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayShifts.map(shift => `
                    <tr>
                      <td>${shift.worker_name || '-'}</td>
                      <td>${shift.job_position || '-'}</td>
                      <td>${shift.start_time || ''} - ${shift.end_time || ''} (${(shift.hours_worked || 0).toFixed(1)}${language === 'he' ? ' שע' : 'h'})</td>
                      <td>${formatCurrency(shift.payment_for_shift || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div class="no-shifts">${t.noShifts}</div>
            `}
          </div>
        `;
      }).join('')}
      
      <div class="footer">
        <p>${language === 'he' ? 'נוצר אוטומטית על ידי מערכת ניהול עבודה' : 'Automatically generated by Labor Management System'}</p>
        <p>${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const sentTo = [];

    // Get user's custom sender name
    const senderName = user.email_sender_name || user.business_name || user.full_name || (language === 'he' ? 'מערכת ניהול עבודה' : 'Labor Management System');

    // Send email to user
    try {
      console.log("Sending email to user:", user.email);
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: senderName,
        to: user.email,
        subject: `${t.title} - ${formatDate(weekStart)}`,
        body: emailHTML
      });
      sentTo.push(user.email);
      console.log("Email sent to user successfully");
    } catch (emailError) {
      console.error("Error sending email to user:", emailError);
      throw new Error(`Failed to send email to ${user.email}: ${emailError.message}`);
    }

    // Send to additional email if provided
    if (additionalEmail && additionalEmail.trim()) {
      try {
        console.log("Sending email to additional recipient:", additionalEmail);
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: senderName,
          to: additionalEmail.trim(),
          subject: `${t.title} - ${formatDate(weekStart)}`,
          body: emailHTML
        });
        sentTo.push(additionalEmail.trim());
        console.log("Email sent to additional recipient successfully");
      } catch (additionalEmailError) {
        console.error("Error sending email to additional recipient:", additionalEmailError);
        // Don't throw here - at least one email was sent
      }
    }

    console.log("Emails sent successfully to:", sentTo);

    return Response.json({ 
      success: true, 
      message: 'Schedule sent successfully',
      sentTo: sentTo
    });

  } catch (error) {
    console.error('Error in sendScheduleEmail:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
});
