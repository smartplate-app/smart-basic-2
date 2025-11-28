import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { week_start_date, shifts, predicted_weekly_sales } = body;

        if (!week_start_date || !shifts) {
            return Response.json({ 
                success: false,
                error: 'week_start_date and shifts are required' 
            }, { status: 400 });
        }

        // Generate table rows
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNames = {
            monday: 'שני',
            tuesday: 'שלישי',
            wednesday: 'רביעי',
            thursday: 'חמישי',
            friday: 'שישי',
            saturday: 'שבת',
            sunday: 'ראשון'
        };

        const shiftsByDay = {};
        days.forEach(day => { shiftsByDay[day] = []; });
        shifts.forEach(shift => {
            if (shift.day && shiftsByDay[shift.day]) {
                shiftsByDay[shift.day].push(shift);
            }
        });

        const tableRows = days.map(day => {
            const dayShifts = shiftsByDay[day];
            const totalHours = dayShifts.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
            const totalCost = dayShifts.reduce((sum, s) => sum + (s.payment_for_shift || 0), 0);
            const shiftDate = dayShifts[0]?.date || '';

            return `
                <tr>
                    <td><strong>${dayNames[day]}</strong></td>
                    <td>${shiftDate ? new Date(shiftDate).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : ''}</td>
                    <td>
                        ${dayShifts.map(shift => `
                            <div style="background: #f8f9ff; border-radius: 8px; padding: 8px; margin: 4px;">
                                <div style="font-weight: bold; color: #667eea;">${shift.worker_name || ''}</div>
                                <div style="color: #666; font-size: 13px;">${shift.start_time} - ${shift.end_time}</div>
                                <div style="color: #999; font-size: 12px;">${shift.hours_worked || 0} שעות</div>
                            </div>
                        `).join('') || '-'}
                    </td>
                    <td><strong>${totalHours.toFixed(1)}</strong></td>
                    <td><strong>₪${totalCost.toLocaleString()}</strong></td>
                </tr>
            `;
        }).join('');

        const totalShifts = shifts.length;
        const totalHours = shifts.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
        const totalCost = shifts.reduce((sum, s) => sum + (s.payment_for_shift || 0), 0);

        const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>לוח משמרות ${week_start_date}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 10px;
            font-size: 32px;
        }
        .date {
            text-align: center;
            color: #666;
            margin-bottom: 20px;
            font-size: 18px;
        }
        .sales-info {
            background: #f0f4ff;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
            font-size: 18px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 2px solid #e0e0e0;
            padding: 12px;
            text-align: center;
        }
        th {
            background: #667eea;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }
        .totals {
            background: #f0f4ff;
            padding: 20px;
            border-radius: 10px;
            margin-top: 30px;
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📅 לוח משמרות שבועי</h1>
        <div class="date">שבוע מתאריך: ${new Date(week_start_date).toLocaleDateString('he-IL')}</div>
        
        ${predicted_weekly_sales > 0 ? `
        <div class="sales-info">
            <strong>מכירות שבועיות צפויות:</strong> ₪${predicted_weekly_sales.toLocaleString()}
        </div>
        ` : ''}
        
        <table>
            <thead>
                <tr>
                    <th>יום</th>
                    <th>תאריך</th>
                    <th>משמרות</th>
                    <th>סה"כ שעות</th>
                    <th>סה"כ עלות</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        
        <div class="totals">
            <div style="font-size: 20px; margin-bottom: 10px;">
                <strong>סיכום שבועי</strong>
            </div>
            <div style="display: flex; justify-content: space-around; margin-top: 15px;">
                <div>
                    <div style="font-size: 14px; color: #666;">משמרות</div>
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">${totalShifts}</div>
                </div>
                <div>
                    <div style="font-size: 14px; color: #666;">שעות</div>
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">${totalHours.toFixed(1)}</div>
                </div>
                <div>
                    <div style="font-size: 14px; color: #666;">עלות</div>
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">₪${totalCost.toLocaleString()}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            נוצר אוטומטית ממערכת ניהול המסעדה 🍽️
        </div>
    </div>
</body>
</html>`;

        // Create a File object properly for Deno
        const fileName = `schedule-${week_start_date}.html`;
        const htmlFile = new File([html], fileName, { type: 'text/html; charset=utf-8' });

        // Upload using service role to ensure permissions
        const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({ 
            file: htmlFile
        });
        
        if (!uploadResponse || !uploadResponse.file_url) {
            throw new Error('Failed to upload schedule file - no URL returned');
        }

        return Response.json({ 
            success: true,
            file_url: uploadResponse.file_url
        });

    } catch (error) {
        console.error('Error in generateScheduleJPG:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});