import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const scheduleId = body.scheduleId;
        const language = body.language || 'he';

        if (!scheduleId) {
            return Response.json({ error: 'Schedule ID required' }, { status: 400 });
        }

        // Get the schedule using service role
        const schedule = await base44.asServiceRole.entities.WeeklySchedule.get(scheduleId);
        
        if (!schedule) {
            return Response.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Translations
        const translations = {
            he: {
                title: 'סידור עבודה שבועי',
                position: 'תפקיד',
                days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
            },
            en: {
                title: 'Weekly Work Schedule',
                position: 'Position',
                days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            }
        };

        const t = translations[language] || translations.en;
        const isRTL = language === 'he';

        // Format dates
        const weekStart = new Date(schedule.week_start_date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const dateRange = `${weekStart.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        // Get unique positions
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const positions = [...new Set((schedule.shifts || []).map(s => s.job_position))];

        // Build table rows
        let tableRows = '';
        positions.forEach(position => {
            let row = `<tr><td class="position-cell">${position}</td>`;
            
            days.forEach(day => {
                const dayShifts = (schedule.shifts || []).filter(s => 
                    s.job_position === position && s.day === day
                );
                
                if (dayShifts.length > 0) {
                    const shiftHTML = dayShifts.map(shift => 
                        `<div class="shift"><div class="worker-name">${shift.worker_name}</div><div class="shift-time">${shift.start_time} - ${shift.end_time}</div></div>`
                    ).join('');
                    row += `<td>${shiftHTML}</td>`;
                } else {
                    row += `<td class="empty-cell">-</td>`;
                }
            });
            
            row += '</tr>';
            tableRows += row;
        });

        // Build day headers
        const dayHeaders = t.days.map(day => `<th>${day}</th>`).join('');

        // Generate HTML
        const html = `<!DOCTYPE html>
<html lang="${language}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 10px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .business-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .date-range {
            font-size: 16px;
            opacity: 0.95;
        }
        
        .table-container {
            overflow-x: auto;
            padding: 15px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            min-width: 800px;
        }
        
        th {
            background: #667eea;
            color: white;
            padding: 12px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            border: 1px solid #5568d3;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        td {
            padding: 10px 8px;
            border: 1px solid #e0e0e0;
            vertical-align: top;
            min-height: 60px;
        }
        
        .position-cell {
            background: #f5f5f5;
            font-weight: bold;
            color: #333;
            font-size: 13px;
            min-width: 100px;
            position: sticky;
            ${isRTL ? 'right' : 'left'}: 0;
            z-index: 5;
        }
        
        .shift {
            margin-bottom: 8px;
            padding: 8px;
            background: #f8f9ff;
            border-radius: 6px;
            border-${isRTL ? 'right' : 'left'}: 3px solid #667eea;
        }
        
        .shift:last-child {
            margin-bottom: 0;
        }
        
        .worker-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
            font-size: 13px;
        }
        
        .shift-time {
            color: #666;
            font-size: 12px;
        }
        
        .empty-cell {
            text-align: center;
            color: #ccc;
            font-size: 18px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
            }
        }
        
        @media (max-width: 768px) {
            .header {
                padding: 15px;
            }
            
            .title {
                font-size: 22px;
            }
            
            .business-name {
                font-size: 18px;
            }
            
            .date-range {
                font-size: 14px;
            }
            
            th, td {
                padding: 8px 5px;
                font-size: 12px;
            }
            
            .worker-name {
                font-size: 12px;
            }
            
            .shift-time {
                font-size: 11px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${user.business_name ? `<div class="business-name">${user.business_name}</div>` : ''}
            <div class="title">${t.title}</div>
            <div class="date-range">${dateRange}</div>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>${t.position}</th>
                        ${dayHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;

        // Upload HTML file
        const htmlBlob = new TextEncoder().encode(html);
        const fileName = `schedule_${schedule.week_number}_${Date.now()}.html`;
        
        const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
            file: new File([htmlBlob], fileName, { type: 'text/html' })
        });

        return Response.json({ 
            success: true,
            file_url: uploadResponse.file_url 
        });

    } catch (error) {
        console.error('Error generating schedule HTML:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});