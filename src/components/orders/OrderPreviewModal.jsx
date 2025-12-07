import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Monitor, Download } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import { createPageUrl } from '@/utils';
import html2canvas from 'html2canvas';
import { base44 } from '@/api/base44Client';

export default function OrderPreviewModal({ order, isOpen, onClose, onSend }) {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState('mobile');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  
  if (!isOpen || !order) return null;

  // Encode minimal order data in URL for true public access (no login required)
  const minimalOrder = {
    n: order.order_number,
    s: order.supplier_name,
    r: order.restaurant_name,
    a: order.restaurant_address,
    d: order.delivery_date,
    i: (order.items || []).map(item => ({
      n: item.item_name,
      q: item.quantity,
      u: item.unit
    })),
    t: order.notes
  };
  const orderData = encodeURIComponent(JSON.stringify(minimalOrder));
  const orderUrl = `${window.location.origin}${createPageUrl(`PublicOrder?d=${orderData}`)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);

      // Create HTML content with Hebrew support
      const htmlContent = `<!DOCTYPE html>
  <html dir="${language === 'he' ? 'rtl' : 'ltr'}" lang="${language === 'he' ? 'he' : 'en'}">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: white;
      color: #000;
      line-height: 1.6;
      direction: ${language === 'he' ? 'rtl' : 'ltr'};
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 18px;
    }
    .section {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      background: #f9fafb;
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #1e293b;
    }
    .business-info {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .delivery-date {
      border-color: #fbbf24;
      background: #fef3c7;
      text-align: center;
    }
    .items-section {
      border-color: #22c55e;
      background: #f0fdf4;
    }
    .notes-section {
      border-color: #f59e0b;
      background: #fef7cd;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    th, td {
      padding: 12px;
      text-align: ${language === 'he' ? 'right' : 'left'};
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
      margin-top: 30px;
    }
    @media print {
      .container {
        padding: 0;
      }
    }
  </style>
  </head>
  <body>
  <div class="container">
    <div class="header">
      <h1>${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}</h1>
      <p>${language === 'he' ? 'ספק:' : 'Supplier:'} ${order.supplier_name}</p>
    </div>

    <div class="section business-info">
      <h2>${language === 'he' ? 'פרטי העסק' : 'Business Details'}</h2>
      <p style="font-size: 18px; margin: 8px 0;"><strong>🏢 ${order.restaurant_name}</strong></p>
      ${order.restaurant_address ? `<p style="margin: 8px 0;">📍 ${order.restaurant_address}</p>` : ''}
    </div>

    ${order.delivery_date ? `
    <div class="section delivery-date">
      <p style="font-size: 18px; font-weight: bold;">
        📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
      </p>
    </div>
    ` : ''}

    <div class="section items-section">
      <h2>📋 ${language === 'he' ? 'רשימת מוצרים' : 'Items List'}</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${language === 'he' ? 'מוצר' : 'Item'}</th>
            <th>${language === 'he' ? 'כמות' : 'Quantity'}</th>
            <th>${language === 'he' ? 'יחידה' : 'Unit'}</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td style="font-weight: 500;">${item.item_name}</td>
              <td style="font-weight: bold; color: #059669;">${item.quantity}</td>
              <td>${item.unit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${order.notes ? `
    <div class="section notes-section">
      <h2>📝 ${language === 'he' ? 'הערות' : 'Notes'}</h2>
      <p>${order.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Smart Plate - ${language === 'he' ? 'מערכת ניהול ספקים' : 'Supplier Management System'}</p>
      <p style="margin-top: 5px; font-size: 12px;">${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</p>
    </div>
  </div>
  </body>
  </html>`;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${order.order_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setDownloading(false);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setDownloading(false);
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
            onClick={handleDownloadPDF}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {downloading 
              ? (language === 'he' ? 'מוריד...' : 'Downloading...') 
              : (language === 'he' ? 'הורד PDF' : 'Download PDF')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}