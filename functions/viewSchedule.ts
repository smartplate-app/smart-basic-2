import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const scheduleId = url.searchParams.get('id');
    const lang = url.searchParams.get('lang') || 'he';

    if (!scheduleId) {
      return new Response('Missing schedule ID', { 
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const base44 = createClientFromRequest(req);
    const schedule = await base44.asServiceRole.entities.WeeklySchedule.get(scheduleId);

    if (!schedule) {
      return new Response('Schedule not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const translations = {
      he: {
        weekly_schedule: 'לוח משמרות שבועי',
        position: 'תפקיד',
        monday: 'שני',
        tuesday: 'שלישי',
        wednesday: 'רביעי',
        thursday: 'חמישי',
        friday: 'שישי',
        saturday: 'שבת',
        sunday: 'ראשון',
        total_hours: 'סה"כ שעות',
        hrs: 'שע׳',
        no_shifts: 'אין משמרות'
      },
      en: {
        weekly_schedule: 'Weekly Schedule',
        position: 'Position',
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
        total_hours: 'Total Hours',
        hrs: 'hrs',
        no_shifts: 'No shifts'
      }
    };

    const t = translations[lang];
    const isRTL = lang === 'he';
    
    const days = isRTL 
      ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    const dayLabels = isRTL
      ? [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday]
      : [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday];

    // Get unique positions from shifts
    const positions = [...new Set(schedule.shifts.map(s => s.job_position))].map(name => ({
      name: name,
      id: schedule.shifts.find(s => s.job_position === name)?.job_position_id
    }));

    // Format dates
    const weekStart = new Date(schedule.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const dateRange = `${weekStart.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.weekly_schedule}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #1f2937;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .header .date {
      font-size: 18px;
      color: #6b7280;
    }
    
    .schedule-card {
      background: white;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      overflow-x: auto;
    }
    
    .stats {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 15px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .stats-value {
      font-size: 36px;
      font-weight: bold;
      margin-top: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 800px;
    }
    
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    th {
      padding: 16px 12px;
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      border: 2px solid #5568d3;
    }
    
    th:first-child {
      text-align: ${isRTL ? 'right' : 'left'};
      min-width: 150px;
    }
    
    tbody tr {
      border-bottom: 2px solid #e5e7eb;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    td {
      padding: 16px 12px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    
    td:first-child {
      background: #f3f4f6;
      font-weight: 600;
      text-align: ${isRTL ? 'right' : 'left'};
      color: #4f46e5;
    }
    
    .shift-cell {
      background: #f0f9ff;
      border-${isRTL ? 'right' : 'left'}: 3px solid #667eea;
    }
    
    .worker-name {
      font-weight: 600;
      color: #7c3aed;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .shift-time {
      font-size: 13px;
      color: #6b7280;
    }
    
    .empty-cell {
      color: #9ca3af;
      font-size: 12px;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }
      
      .header {
        padding: 20px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .header .date {
        font-size: 14px;
      }
      
      .schedule-card {
        padding: 10px;
      }
      
      th, td {
        padding: 10px 6px;
        font-size: 12px;
      }
      
      .stats-value {
        font-size: 28px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${t.weekly_schedule}</h1>
      <div class="date">${dateRange}</div>
    </div>
    
    ${schedule.total_hours ? `
    <div class="stats">
      <div>${t.total_hours}</div>
      <div class="stats-value">${schedule.total_hours.toFixed(1)} ${t.hrs}</div>
    </div>
    ` : ''}
    
    <div class="schedule-card">
      <table>
        <thead>
          <tr>
            <th>${t.position}</th>
            ${dayLabels.map(day => `<th>${day}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${positions.map(position => `
            <tr>
              <td>${position.name}</td>
              ${days.map(day => {
                const shift = schedule.shifts.find(s => s.job_position_id === position.id && s.day === day);
                if (shift) {
                  return `
                    <td class="shift-cell">
                      <div class="worker-name">${shift.worker_name}</div>
                      <div class="shift-time">${shift.start_time} - ${shift.end_time}</div>
                    </td>
                  `;
                }
                return `<td class="empty-cell">-</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Error</title></head>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>Error loading schedule</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `, { 
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});