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

      // Generate a secure token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Calculate expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create token record with full order data
      await base44.entities.OrderShareToken.create({
        token: token,
        order_id: order.id,
        order_data: {
          order_number: order.order_number,
          supplier_name: order.supplier_name,
          restaurant_name: order.restaurant_name,
          restaurant_address: order.restaurant_address,
          delivery_date: order.delivery_date,
          items: order.items,
          notes: order.notes
        },
        expires_at: expiresAt.toISOString(),
        view_count: 0
      });

      const secureUrl = `${window.location.origin}${createPageUrl(`PublicOrder?token=${token}`)}`;
      setOrderUrl(secureUrl);
    } catch (error) {
      console.error('Error generating secure link:', error);
    } finally {
      setGeneratingLink(false);
    }
  };

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

  const handleDownloadImage = async () => {
    try {
      setDownloading(true);

      // Create a temporary container with the order content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '40px';
      tempContainer.style.fontFamily = 'system-ui, sans-serif';
      tempContainer.style.direction = language === 'he' ? 'rtl' : 'ltr';

      // Build the order HTML
      tempContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 32px; text-align: center; border-radius: 16px 16px 0 0; margin: -40px -40px 20px -40px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">
            ${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}
          </h1>
          <p style="font-size: 16px; opacity: 0.9; margin: 0;">
            ${language === 'he' ? 'ספק:' : 'Supplier:'} ${order.supplier_name}
          </p>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #e2e8f0;">
          <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 12px 0;">
            ${language === 'he' ? 'פרטי העסק' : 'Business Details'}
          </h2>
          <p style="margin: 8px 0; font-size: 16px;"><strong>🏢 ${order.restaurant_name}</strong></p>
          ${order.restaurant_address ? `<p style="margin: 8px 0; font-size: 14px; color: #64748b;">📍 ${order.restaurant_address}</p>` : ''}
        </div>

        ${order.delivery_date ? `
        <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 2px solid #fbbf24; text-align: center;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
            📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
          </p>
        </div>
        ` : ''}

        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #22c55e;">
          <h2 style="font-size: 18px; font-weight: bold; color: #15803d; margin: 0 0 16px 0;">
            📋 ${language === 'he' ? 'רשימת מוצרים' : 'Items List'}
          </h2>
          <div style="background: white; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 12px; text-align: ${language === 'he' ? 'right' : 'left'}; border-bottom: 1px solid #e5e7eb;">#</th>
                  <th style="padding: 12px; text-align: ${language === 'he' ? 'right' : 'left'}; border-bottom: 1px solid #e5e7eb;">${language === 'he' ? 'מוצר' : 'Item'}</th>
                  <th style="padding: 12px; text-align: ${language === 'he' ? 'right' : 'left'}; border-bottom: 1px solid #e5e7eb;">${language === 'he' ? 'כמות' : 'Qty'}</th>
                  <th style="padding: 12px; text-align: ${language === 'he' ? 'right' : 'left'}; border-bottom: 1px solid #e5e7eb;">${language === 'he' ? 'יחידה' : 'Unit'}</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map((item, index) => `
                  <tr style="background: ${index % 2 === 0 ? 'white' : '#f9fafb'};">
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
                    <td style="padding: 12px; font-weight: 500; border-bottom: 1px solid #e5e7eb;">${item.item_name}</td>
                    <td style="padding: 12px; font-weight: 600; color: #059669; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.unit}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${order.notes ? `
        <div style="background: #fef7cd; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 2px solid #f59e0b;">
          <h3 style="font-size: 16px; font-weight: bold; color: #92400e; margin: 0 0 8px 0;">
            📝 ${language === 'he' ? 'הערות' : 'Notes'}
          </h3>
          <p style="margin: 0; color: #78350f;">${order.notes}</p>
        </div>
        ` : ''}

        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p style="font-size: 12px; margin: 0;">Smart Plate - ${language === 'he' ? 'מערכת ניהול ספקים' : 'Supplier Management'}</p>
        </div>
      `;

      document.body.appendChild(tempContainer);

      // Capture the element
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      // Remove temp container
      document.body.removeChild(tempContainer);

      // Convert to blob and try to copy to clipboard
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `order-${order.order_number}.jpg`, { type: 'image/jpeg' });

        // Format phone for WhatsApp
        let phone = order.supplier_phone || '';
        phone = phone.replace(/\D/g, '');
        if (phone.startsWith('0')) {
          phone = '972' + phone.substring(1);
        } else if (!phone.startsWith('972')) {
          phone = '972' + phone;
        }

        const message = `${language === 'he' ? 'הזמנה' : 'Order'} #${order.order_number}\n${language === 'he' ? 'מסעדה:' : 'Restaurant:'} ${order.restaurant_name}\n\n${language === 'he' ? 'לצפייה בהזמנה ולהדפסה:' : 'View and print order:'}\n${orderUrl}`;
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        // Try to copy image to clipboard
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/jpeg': blob
            })
          ]);

          // Open WhatsApp after copying
          window.open(whatsappUrl, '_blank');
          setDownloading(false);
          alert(language === 'he' ? 'התמונה הועתקה! הדבק אותה ב-WhatsApp' : 'Image copied! Paste it in WhatsApp');
          return;
        } catch (clipboardErr) {
          console.log('Clipboard not supported, trying share API');
        }

        // Try Web Share API for mobile
        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              text: message
            });
            setDownloading(false);
            return;
          } catch (shareErr) {
            console.log('Share cancelled');
          }
        }

        // Fallback: Download as JPG
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${order.order_number}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
          setDownloading(false);
        }, 500);
      }, 'image/jpeg', 0.95);

    } catch (err) {
      console.error('Failed to process image:', err);
      setDownloading(false);
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