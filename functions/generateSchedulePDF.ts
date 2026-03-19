import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.5.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const scheduleId = body.scheduleId;

        if (!scheduleId) {
            return Response.json({ error: 'Schedule ID required' }, { status: 400 });
        }

        // Get the schedule using service role to ensure access
        const schedule = await base44.asServiceRole.entities.WeeklySchedule.get(scheduleId);
        
        if (!schedule) {
            return Response.json({ error: 'Schedule not found' }, { status: 404 });
        }

        // Create PDF in landscape mode
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Add business name if available (in English to avoid font issues)
        if (user.business_name) {
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(user.business_name, 148, 15, { align: 'center' });
        }

        // Add title (in English to avoid font issues)
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Weekly Work Schedule', 148, user.business_name ? 25 : 20, { align: 'center' });

        // Add date range
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const weekStart = new Date(schedule.week_start_date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        doc.text(dateRange, 148, user.business_name ? 33 : 28, { align: 'center' });

        // Days in English
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Get unique positions
        const positions = [...new Set((schedule.shifts || []).map(s => s.job_position))];

        // Create table data
        const tableData = [];
        
        positions.forEach(position => {
            const row = [position];
            
            days.forEach(day => {
                const dayShifts = (schedule.shifts || []).filter(s => 
                    s.job_position === position && s.day === day
                );
                
                if (dayShifts.length > 0) {
                    const shiftText = dayShifts.map(shift => {
                        return `${shift.worker_name}\n${shift.start_time}-${shift.end_time}`;
                    }).join('\n');
                    row.push(shiftText);
                } else {
                    row.push('-');
                }
            });
            
            tableData.push(row);
        });

        // Generate table
        doc.autoTable({
            startY: user.business_name ? 40 : 35,
            head: [['Position', ...dayLabels]],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [66, 135, 245],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 3,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold', fillColor: [240, 240, 240] }
            },
            margin: { left: 10, right: 10 }
        });

        // Add footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        const footerText = `Generated on ${new Date().toLocaleString('en-US')}`;
        doc.text(footerText, 148, pageHeight - 10, { align: 'center' });

        // Get PDF as array buffer
        const pdfArrayBuffer = doc.output('arraybuffer');
        const pdfBlob = new Uint8Array(pdfArrayBuffer);
        
        // Create file name
        const fileName = `schedule_${schedule.week_number}_${Date.now()}.pdf`;
        
        // Upload file using service role
        const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
            file: new File([pdfBlob], fileName, { type: 'application/pdf' })
        });

        return Response.json({ 
            success: true,
            file_url: uploadResponse.file_url 
        });

    } catch (error) {
        console.error('Error generating schedule PDF:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});