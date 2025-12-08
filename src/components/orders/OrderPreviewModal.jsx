import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Monitor, Download } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import { createPageUrl } from '@/utils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { base44 } from '@/api/base44Client';

export default function OrderPreviewModal({ order, isOpen, onClose, onSend }) {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState('mobile');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [orderUrl, setOrderUrl] = React.useState('');
  const [generatingLink, setGeneratingLink] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && order && !orderUrl) {
      generateSecureLink();
    }
  }, [isOpen, order]);

  const generateSecureLink = async () => {
    try {
      setGeneratingLink(true);

      // Embed order data directly in URL (no database needed, truly public)
      const orderData = {
        order_number: order.order_number,
        supplier_name: order.supplier_name,
        restaurant_name: order.restaurant_name,
        restaurant_address: order.restaurant_address,
        delivery_date: order.delivery_date,
        items: order.items,
        notes: order.notes,
        created_date: order.created_date,
        status: order.status
      };

      const encodedData = encodeURIComponent(JSON.stringify(orderData));
      const secureUrl = `${window.location.origin}${createPageUrl(`OrderDetails?data=${encodedData}`)}`;
      setOrderUrl(secureUrl);
    } catch (error) {
      console.error('Error generating secure link:', error);
    } finally {
      setGeneratingLink(false);
    }
  };

  if (!isOpen || !order) return null;

  const handleDownloadImage = async () => {
    try {
      setDownloading(true);

      // Create PDF using jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper to add text with word wrap
      const addText = (text, fontSize, color = [0, 0, 0], bold = false, align = 'right') => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);
        if (bold) pdf.setFont('helvetica', 'bold');
        else pdf.setFont('helvetica', 'normal');
        
        const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
        pdf.text(lines, align === 'right' ? pageWidth - margin : margin, yPosition, { align });
        yPosition += lines.length * (fontSize / 3);
      };

      // Header background
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Header text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}`, pageWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${language === 'he' ? 'ספק:' : 'Supplier:'} ${order.supplier_name}`, pageWidth / 2, 30, { align: 'center' });

      yPosition = 50;

      // Business Details
      addText(language === 'he' ? 'פרטי העסק' : 'Business Details', 14, [30, 41, 59], true);
      yPosition += 3;
      addText(`🏢 ${order.restaurant_name}`, 12);
      if (order.restaurant_address) {
        addText(`📍 ${order.restaurant_address}`, 10, [100, 116, 139]);
      }
      yPosition += 5;

      // Delivery Date
      if (order.delivery_date) {
        addText(`📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}`, 12, [146, 64, 14], true);
        yPosition += 5;
      }

      // Items List Header
      addText(`📋 ${language === 'he' ? 'רשימת מוצרים' : 'Items List'}`, 14, [21, 128, 61], true);
      yPosition += 5;

      // Items Table
      const tableStartY = yPosition;
      const colWidths = [15, 90, 30, 30];
      const headers = ['#', language === 'he' ? 'מוצר' : 'Item', language === 'he' ? 'כמות' : 'Qty', language === 'he' ? 'יחידה' : 'Unit'];
      
      // Table headers
      pdf.setFillColor(249, 250, 251);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      let xPos = pageWidth - margin;
      headers.forEach((header, i) => {
        pdf.text(header, xPos - colWidths[i] / 2, yPosition + 5, { align: 'center' });
        xPos -= colWidths[i];
      });
      
      yPosition += 10;

      // Table rows
      pdf.setFont('helvetica', 'normal');
      (order.items || []).forEach((item, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        if (index % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(249, 250, 251);
        }
        pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 8, 'F');

        xPos = pageWidth - margin;
        const rowData = [item.unit, item.quantity, item.item_name, index + 1];
        rowData.forEach((data, i) => {
          pdf.text(String(data), xPos - colWidths[i] / 2, yPosition + 3, { align: 'center' });
          xPos -= colWidths[i];
        });

        yPosition += 8;
      });

      yPosition += 5;

      // Notes
      if (order.notes) {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }
        addText(`📝 ${language === 'he' ? 'הערות' : 'Notes'}`, 12, [146, 64, 14], true);
        yPosition += 2;
        addText(order.notes, 10, [120, 53, 15]);
        yPosition += 5;
      }

      // Footer
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Smart Plate - ' + (language === 'he' ? 'מערכת ניהול ספקים' : 'Supplier Management'), pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF as blob
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `order-${order.order_number}.pdf`, { type: 'application/pdf' });

      // Format phone for WhatsApp
      let phone = order.supplier_phone || '';
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '972' + phone.substring(1);
      } else if (!phone.startsWith('972')) {
        phone = '972' + phone;
      }

      const message = `${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}\n${language === 'he' ? 'מסעדה:' : 'Restaurant:'} ${order.restaurant_name}`;

      // Download PDF first
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open WhatsApp with instructions
      const whatsappMessage = `${message}\n\n${language === 'he' ? '📎 לחץ על + והצמד את קובץ ה-PDF שהורד (order-' + order.order_number + '.pdf)' : '📎 Click + and attach the downloaded PDF (order-' + order.order_number + '.pdf)'}`;
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        setDownloading(false);
        alert(language === 'he' 
          ? `✅ PDF הורד בהצלחה!\n\nעכשיו:\n1. בחר את קובץ ה-PDF מהתיקייה Downloads\n2. צרף אותו להודעת WhatsApp` 
          : `✅ PDF downloaded!\n\nNow:\n1. Find the PDF in your Downloads folder\n2. Attach it to the WhatsApp message`);
      }, 500);

    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setDownloading(false);
      alert(language === 'he' ? 'שגיאה ביצירת PDF' : 'Error creating PDF');
    }
  };

  const handleCopyPDFLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };





  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('order_preview')}</h2>
            <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="gap-2"
              >
                <Smartphone className="w-4 h-4" />
                {t('mobile')}
              </Button>
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="gap-2"
              >
                <Monitor className="w-4 h-4" />
                {t('desktop')}
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 bg-gray-100 p-4 overflow-auto">
          <div className={`mx-auto bg-white shadow-lg ${viewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'}`}>
            <div className={`${viewMode === 'mobile' ? 'h-[667px]' : 'h-[600px]'} w-full`}>
              <iframe
                src={orderUrl}
                className="w-full h-full border-0"
                title={t('order_preview')}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 sticky bottom-0">
          <Button
            onClick={onClose}
            variant="outline"
          >
            {t('close')}
          </Button>
          <Button
            onClick={handleCopyPDFLink}
            variant="outline"
            className="flex items-center gap-2"
          >
            {copied ? '✓' : '🔗'}
            {copied 
              ? (language === 'he' ? 'הועתק!' : 'Copied!') 
              : (language === 'he' ? 'העתק קישור להדפסה' : 'Copy Print Link')}
          </Button>
          <Button
            onClick={handleDownloadImage}
            className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium shadow-sm"
            disabled={downloading}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            {downloading 
              ? (language === 'he' ? 'מכין תמונה...' : 'Preparing...') 
              : (language === 'he' ? 'שתף לספק' : 'Share to Supplier')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}