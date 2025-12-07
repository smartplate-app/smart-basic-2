import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { order, language } = body;
    
    console.log('Processing order email:', order.order_number);

    if (!order.supplier_email) {
      return Response.json({ error: 'No supplier email' }, { status: 400 });
    }

    // Generate PDF
    const doc = new jsPDF();
    const isRTL = language === 'he';
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(`${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}`, 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${language === 'he' ? 'ספק:' : 'Supplier:'} ${order.supplier_name}`, 105, 32, { align: 'center' });
    
    // Reset color
    doc.setTextColor(0, 0, 0);
    let y = 55;
    
    // Business Details
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'he' ? 'פרטי העסק' : 'Business Details', 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`🏢 ${order.restaurant_name}`, 20, y);
    if (order.restaurant_address) {
      y += 7;
      doc.text(`📍 ${order.restaurant_address}`, 20, y);
    }
    
    y += 15;
    
    // Delivery Date
    if (order.delivery_date) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}`, 20, y);
      y += 15;
    }
    
    // Items List
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(language === 'he' ? 'רשימת מוצרים' : 'Items List', 20, y);
    y += 10;
    
    // Table headers
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 20, y);
    doc.text(language === 'he' ? 'מוצר' : 'Item', 35, y);
    doc.text(language === 'he' ? 'כמות' : 'Qty', 120, y);
    doc.text(language === 'he' ? 'יחידה' : 'Unit', 150, y);
    y += 7;
    
    // Table content
    doc.setFont('helvetica', 'normal');
    (order.items || []).forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${index + 1}`, 20, y);
      doc.text(item.item_name, 35, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.quantity}`, 120, y);
      doc.setFont('helvetica', 'normal');
      doc.text(item.unit, 150, y);
      y += 7;
    });
    
    // Notes
    if (order.notes) {
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(language === 'he' ? 'הערות' : 'Notes', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(order.notes, 170);
      doc.text(splitNotes, 20, y);
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text('Smart Plate - ' + (language === 'he' ? 'מערכת ניהול ספקים' : 'Supplier Management'), 105, 285, { align: 'center' });
    
    // Convert PDF to base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const pdfBlob = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    console.log('Uploading PDF file...');
    
    // Upload PDF file
    const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new Blob([pdfBlob], { type: 'application/pdf' })
    });
    
    console.log('PDF uploaded:', uploadResponse);
    
    const pdfUrl = uploadResponse.file_url;
    
    if (!pdfUrl) {
      throw new Error('Failed to upload PDF');
    }
    
    console.log('Sending email to:', order.supplier_email);
    
    // Send email with PDF link
    const emailResponse = await base44.asServiceRole.integrations.Core.SendEmail({
      to: order.supplier_email,
      subject: `${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number} - ${order.restaurant_name}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ${isRTL ? 'rtl' : 'ltr'};">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0 0 10px 0; font-size: 28px;">${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}</h1>
            <p style="margin: 0; font-size: 18px; opacity: 0.9;">${order.restaurant_name}</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 20px;">${language === 'he' ? 'שלום,' : 'Hello,'}</p>
            <p style="font-size: 16px; margin-bottom: 20px;">${language === 'he' ? 'מצורפת הזמנה חדשה מ-' : 'Please find attached a new order from '}<strong>${order.restaurant_name}</strong></p>
            
            <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <a href="${pdfUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📄 ${language === 'he' ? 'הורד הזמנה (PDF)' : 'Download Order (PDF)'}
              </a>
            </div>

            ${order.delivery_date ? `
            <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-weight: 600; color: #92400e;">📅 ${language === 'he' ? 'תאריך אספקה מבוקש:' : 'Requested Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</p>
            </div>
            ` : ''}

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">${language === 'he' ? 'בברכה,' : 'Best regards,'}<br>${order.restaurant_name}</p>
          </div>

          <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">Smart Plate - ${language === 'he' ? 'מערכת ניהול ספקים' : 'Supplier Management'}</p>
          </div>
        </div>
      `
    });
    
    console.log('Email sent successfully');

    return Response.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Error sending order email:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      success: false 
    }, { status: 500 });
  }
});