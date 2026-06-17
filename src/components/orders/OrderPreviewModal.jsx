import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Monitor, Copy, Check, Download, Share, MessageCircle, Loader, Mail } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import { createPageUrl } from '@/utils';
import html2canvas from 'html2canvas';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OrderPreviewModal({ order, isOpen, onClose, onSend, onSendEmail, hideActions = false }) {
  const { t, language } = useLanguage();
  const safeT = (key, he, en) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return he;
    return (v === key || !v) ? (en ?? key) : v;
  };

  const getUnitLabel = (u) => {
    if (!u) return '';
    if (language !== 'he') return u;
    const map = { unit: 'יחידה', liter: 'ליטר', kg: 'ק״ג', case: 'ארגז', gram: 'גרם', ml: 'מ״ל' };
    return map[u] || u;
  };

  const [viewMode, setViewMode] = useState('mobile');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [pasteGuideUrl, setPasteGuideUrl] = useState(null);
  const [pregeneratedFile, setPregeneratedFile] = useState(null);
  const urlRef = useRef('');

  useEffect(() => {
    if (isOpen && order && !pregeneratedFile) {
      const generateImage = async () => {
        try {
          let ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
          
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'fixed';
          tempContainer.style.left = '-9999px';
          tempContainer.style.top = '0';
          tempContainer.style.width = '430px';
          tempContainer.style.background = '#ffffff';
          tempContainer.style.padding = '24px';
          tempContainer.style.fontFamily = 'system-ui, sans-serif';
          tempContainer.style.direction = language === 'he' ? 'rtl' : 'ltr';

          tempContainer.innerHTML = `
            <div style="background: white; overflow: hidden;">
              <div style="background: white; color: #111827; padding: 24px 16px 16px; text-align: center; border-bottom: 1px solid #f3f4f6;">
                <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.025em; word-break: break-word;">
                  ${order.supplier_name}
                </h1>
                <div style="display: inline-block; background: #f3f4f6; padding: 4px 12px; border-radius: 9999px; font-size: 14px; color: #4b5563; font-weight: 500;">
                  ${language === 'he' ? 'הזמנה' : 'Order'} <span dir="ltr" style="display: inline-block;">#${ensuredNumber}</span>
                </div>
              </div>
              
              <div style="padding: 24px;">
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; font-size: 15px; color: #4b5563;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>${language === 'he' ? 'מאת:' : 'From:'}</span>
                    <span style="font-weight: 600; color: #111827;">${order.restaurant_name}</span>
                  </div>
                  ${order.business_tax_id ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span>${language === 'he' ? 'ח.פ/עוסק:' : 'Business ID:'}</span>
                    <span style="font-weight: 500; color: #111827;">${order.business_tax_id}</span>
                  </div>` : ''}
                  ${order.restaurant_address ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span>${language === 'he' ? 'כתובת:' : 'Address:'}</span>
                    <span style="font-weight: 500; color: #111827;">${order.restaurant_address}</span>
                  </div>` : ''}
                  ${order.delivery_date ? `
                  <div style="display: flex; justify-content: space-between;">
                    <span>${language === 'he' ? 'תאריך אספקה:' : 'Delivery:'}</span>
                    <span style="font-weight: 500; color: #111827;">${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</span>
                  </div>` : ''}
                  <div style="display: flex; justify-content: space-between;">
                    <span>${language === 'he' ? 'נשלח בתאריך:' : 'Sent At:'}</span>
                    <span style="font-weight: 500; color: #111827;" dir="ltr">${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} ${new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 24px;">
                  <div style="padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 14px; font-weight: 600; color: #4b5563; margin: 0; text-transform: uppercase;">
                      ${language === 'he' ? 'פריטים' : 'Items'}
                    </h2>
                  </div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tbody>
                      ${(order.items || []).map((item, index) => `
                        <tr style="border-bottom: ${index < (order.items || []).length - 1 ? '1px solid #f3f4f6' : 'none'};">
                          <td style="padding: 12px 16px; width: 30px; color: #9ca3af; font-size: 13px;">${index + 1}</td>
                          <td style="padding: 12px 0; font-weight: 500; color: #111827; font-size: 15px;">
                            ${item.item_name || item.name || item.item}
                            ${item.catalog_number ? `<div style="font-size: 12px; color: #6b7280; font-weight: normal; margin-top: 2px;">${language === 'he' ? 'מק"ט:' : 'SKU:'} ${item.catalog_number}</div>` : ''}
                          </td>
                          <td style="padding: 12px 16px; text-align: ${language === 'he' ? 'left' : 'right'};">
                            <div style="display: inline-flex; align-items: baseline; gap: 4px;">
                              <span style="font-weight: 700; color: #111827; font-size: 15px;">${item.quantity}</span>
                              <span style="color: #6b7280; font-size: 13px;">${getUnitLabel(item.unit)}</span>
                            </div>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>

                ${formattedTotal && effectiveTotal > 0 ? `
                <div style="padding: 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                  <span style="font-size: 15px; font-weight: 600; color: #4b5563;">
                    ${language === 'he' ? 'סה״כ לתשלום' : 'Total Amount'}
                  </span>
                  <span style="font-size: 20px; font-weight: 800; color: #111827;">
                    ₪${formattedTotal}
                  </span>
                </div>` : ''}

                ${order.notes ? `
                <div style="background: #fffbeb; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #fde68a;">
                  <h3 style="font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 6px 0; text-transform: uppercase;">
                    ${language === 'he' ? 'הערות להזמנה' : 'Notes'}
                  </h3>
                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">${order.notes}</p>
                </div>
                ` : ''}

                <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/4c53051d0_smartplate_logo_long_big_tp_800x176.png" alt="Smart Plate" style="height: 30px; margin: 0 auto 8px;" />
                  <div style="font-size: 9px; margin-top: 2px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">The ultimate food & labor cost app</div>
                  <div style="font-size: 10px; margin-top: 4px; font-weight: 600; color: #2563eb;">foodcostapp.com</div>
                </div>
              </div>
            </div>
          `;

          document.body.appendChild(tempContainer);

          const canvas = await html2canvas(tempContainer, {
            scale: 1,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
          });

          document.body.removeChild(tempContainer);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const r = await fetch(dataUrl);
          const blob = await r.blob();
          
          const safeName = (order.restaurant_name || '').replace(/[^a-zA-Zא-ת0-9]/g, '_') || 'order';
          const file = new File([blob], `order_${safeName}.jpg`, { type: 'image/jpeg' });
          setPregeneratedFile(file);
        } catch (e) {
          console.error("Pre-generation failed", e);
        }
      };
      // Allow modal animation to finish before starting heavy render
      setTimeout(generateImage, 300);
    }
  }, [isOpen, order, pregeneratedFile, language]);

  if (!isOpen || !order) return null;

  // Prefer ID-based preview for sent orders; use inline payload for drafts to avoid edge cases
  const fallbackNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
  // minimalOrder prepared after total calculation

  // Compute total amount (no per-line money shown, only total)
  const computeItemTotal = (it) => {
    const tot = Number(it.total);
    if (!isNaN(tot) && isFinite(tot) && tot > 0) return tot;
    const p = Number(it.price);
    const q = Number(it.quantity);
    if (!isNaN(p) && isFinite(p) && !isNaN(q) && isFinite(q)) return p * q;
    return 0;
  };
  const rawItemsTotal = (order.items || []).reduce((sum, it) => sum + computeItemTotal(it), 0);
  const effectiveTotal = rawItemsTotal > 0 ? rawItemsTotal : Number(order.total_cost || 0);
  const formattedTotal = effectiveTotal.toLocaleString(language === 'he' ? 'he-IL' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const minimalOrder = {
    n: fallbackNumber,
    s: order.supplier_name,
    r: order.restaurant_name,
    a: order.restaurant_address,
    d: order.delivery_date,
    i: (order.items || []).map(it => ({ n: (it.item_name || it.item || it.name || ''), c: (it.catalog_number || ''), q: it.quantity, u: getUnitLabel(it.unit || it.u || '') })),
    t: order.notes,
    m: effectiveTotal
  };
  const orderData = encodeURIComponent(JSON.stringify(minimalOrder));
  if (!urlRef.current) {
    if (order.id) {
      urlRef.current = `${window.location.origin}${createPageUrl(`PublicOrder?id=${order.id}`)}`;
    } else {
      urlRef.current = `${window.location.origin}${createPageUrl(`PublicOrder?d=${orderData}`)}`;
    }
  }
  const orderUrl = urlRef.current;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadImage = async (opts = {}) => {
    const shareOnly = !!opts.shareOnly;
    
    let ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const shareText = language === 'he' 
      ? `הזמנה ממסעדת ${order.restaurant_name || ''}\n${order.business_tax_id ? `ח.פ/עוסק: ${order.business_tax_id}\n` : ''}${order.restaurant_address ? `כתובת: ${order.restaurant_address}\n` : ''}מספר הזמנה: ${ensuredNumber}`
      : `Order from ${order.restaurant_name || ''}\n${order.business_tax_id ? `Business ID: ${order.business_tax_id}\n` : ''}${order.restaurant_address ? `Address: ${order.restaurant_address}\n` : ''}Order #: ${ensuredNumber}`;

    // Fast path for sharing: use pre-generated file if available to preserve user gesture
    if (shareOnly && pregeneratedFile && navigator.share) {
       try {
          if (!order.order_number && order.id) {
             base44.entities.Order.update(order.id, { order_number: ensuredNumber, status: order.status === 'draft' ? 'sent' : (order.status || 'sent') }).catch(() => {});
             order.order_number = ensuredNumber;
          }
          await navigator.share({ files: [pregeneratedFile], title: language === 'he' ? 'הזמנה לספק' : 'Supplier Order', text: shareText });
          if (onSend) { try { await onSend({ ...order, order_number: ensuredNumber, status: 'sent' }); } catch (_) {} }
          return;
       } catch (e) {
          if (e.name === 'AbortError' || (e.message && e.message.includes('abort'))) return;
          console.error("Fast share failed, falling back to text only", e);
          try {
             await navigator.share({ title: language === 'he' ? 'הזמנה לספק' : 'Supplier Order', text: shareText + "\n\n" + orderUrl });
             if (onSend) { try { await onSend({ ...order, order_number: ensuredNumber, status: 'sent' }); } catch (_) {} }
             return;
          } catch (textErr) {
             if (textErr.name === 'AbortError' || (textErr.message && textErr.message.includes('abort'))) return;
          }
       }
    }

    try {
      setDownloading(true);

      try {
        if (!order.order_number && order.id) {
          base44.entities.Order.update(order.id, {
            order_number: ensuredNumber,
            status: order.status === 'draft' ? 'sent' : (order.status || 'sent')
          }).catch(() => {});
          order.order_number = ensuredNumber;
        }
      } catch (_) {}
      
      // Create a temporary container with the order content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '430px'; // Mobile width ratio
      tempContainer.style.background = '#ffffff';
      tempContainer.style.padding = '24px';
      tempContainer.style.fontFamily = 'system-ui, sans-serif';
      tempContainer.style.direction = language === 'he' ? 'rtl' : 'ltr';

      // Build the order HTML
      tempContainer.innerHTML = `
        <div style="background: white; overflow: hidden;">
          <div style="background: white; color: #111827; padding: 24px 16px 16px; text-align: center; border-bottom: 1px solid #f3f4f6;">
            <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.025em; word-break: break-word;">
              ${order.supplier_name}
            </h1>
            <div style="display: inline-block; background: #f3f4f6; padding: 4px 12px; border-radius: 9999px; font-size: 14px; color: #4b5563; font-weight: 500;">
              ${language === 'he' ? 'הזמנה' : 'Order'} <span dir="ltr" style="display: inline-block;">#${ensuredNumber}</span>
            </div>
          </div>
          
          <div style="padding: 24px;">
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; font-size: 15px; color: #4b5563;">
              <div style="display: flex; justify-content: space-between;">
                <span>${language === 'he' ? 'מאת:' : 'From:'}</span>
                <span style="font-weight: 600; color: #111827;">${order.restaurant_name}</span>
              </div>
              ${order.business_tax_id ? `
              <div style="display: flex; justify-content: space-between;">
                <span>${language === 'he' ? 'ח.פ/עוסק:' : 'Business ID:'}</span>
                <span style="font-weight: 500; color: #111827;">${order.business_tax_id}</span>
              </div>` : ''}
              ${order.restaurant_address ? `
              <div style="display: flex; justify-content: space-between;">
                <span>${language === 'he' ? 'כתובת:' : 'Address:'}</span>
                <span style="font-weight: 500; color: #111827;">${order.restaurant_address}</span>
              </div>` : ''}
              ${order.delivery_date ? `
              <div style="display: flex; justify-content: space-between;">
                <span>${language === 'he' ? 'תאריך אספקה:' : 'Delivery:'}</span>
                <span style="font-weight: 500; color: #111827;">${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</span>
              </div>` : ''}
              <div style="display: flex; justify-content: space-between;">
                <span>${language === 'he' ? 'נשלח בתאריך:' : 'Sent At:'}</span>
                <span style="font-weight: 500; color: #111827;" dir="ltr">${new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} ${new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>

            <div style="background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; margin-bottom: 24px;">
              <div style="padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <h2 style="font-size: 14px; font-weight: 600; color: #4b5563; margin: 0; text-transform: uppercase;">
                  ${language === 'he' ? 'פריטים' : 'Items'}
                </h2>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${(order.items || []).map((item, index) => `
                    <tr style="border-bottom: ${index < (order.items || []).length - 1 ? '1px solid #f3f4f6' : 'none'};">
                      <td style="padding: 12px 16px; width: 30px; color: #9ca3af; font-size: 13px;">${index + 1}</td>
                      <td style="padding: 12px 0; font-weight: 500; color: #111827; font-size: 15px;">
                        ${item.item_name || item.name || item.item}
                        ${item.catalog_number ? `<div style="font-size: 12px; color: #6b7280; font-weight: normal; margin-top: 2px;">${language === 'he' ? 'מק"ט:' : 'SKU:'} ${item.catalog_number}</div>` : ''}
                      </td>
                      <td style="padding: 12px 16px; text-align: ${language === 'he' ? 'left' : 'right'};">
                        <div style="display: inline-flex; align-items: baseline; gap: 4px;">
                          <span style="font-weight: 700; color: #111827; font-size: 15px;">${item.quantity}</span>
                          <span style="color: #6b7280; font-size: 13px;">${getUnitLabel(item.unit)}</span>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            ${formattedTotal && effectiveTotal > 0 ? `
            <div style="padding: 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <span style="font-size: 15px; font-weight: 600; color: #4b5563;">
                ${language === 'he' ? 'סה״כ לתשלום' : 'Total Amount'}
              </span>
              <span style="font-size: 20px; font-weight: 800; color: #111827;">
                ₪${formattedTotal}
              </span>
            </div>` : ''}

            ${order.notes ? `
            <div style="background: #fffbeb; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #fde68a;">
              <h3 style="font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 6px 0; text-transform: uppercase;">
                ${language === 'he' ? 'הערות להזמנה' : 'Notes'}
              </h3>
              <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">${order.notes}</p>
            </div>
            ` : ''}

            <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/4c53051d0_smartplate_logo_long_big_tp_800x176.png" alt="Smart Plate" style="height: 30px; margin: 0 auto 8px;" />
              <div style="font-size: 9px; margin-top: 2px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">The ultimate food & labor cost app</div>
              <div style="font-size: 10px; margin-top: 4px; font-weight: 600; color: #2563eb;">foodcostapp.com</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(tempContainer);

      // Capture the element
      const canvas = await html2canvas(tempContainer, {
        scale: shareOnly ? 1 : 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      // Remove temp container
      document.body.removeChild(tempContainer);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const r = await fetch(dataUrl);
      const blob = await r.blob();
      
      const safeName = (order.restaurant_name || '').replace(/[^a-zA-Zא-ת0-9]/g, '_') || 'order';
      const file = new File([blob], `order_${safeName}.jpg`, { type: 'image/jpeg' });

      let shareSucceeded = false;
      
      if (navigator.share) {
        try {
          // Attempt to share the file + text natively
          await navigator.share({ 
            files: [file], 
            title: language === 'he' ? 'הזמנה לספק' : 'Supplier Order',
            text: shareText
          });
          shareSucceeded = true;
        } catch(e) {
          console.error('Share failed with file, trying text only', e);
          if (e.name === 'AbortError' || (e.message && e.message.includes('abort'))) {
             setDownloading(false);
             return; // User cancelled the share sheet intentionally
          }
          // If file sharing fails (unsupported on this specific OS version), fallback to sharing just the text
          try {
            await navigator.share({ 
              title: language === 'he' ? 'הזמנה לספק' : 'Supplier Order',
              text: shareText + "\n\n" + orderUrl
            });
            shareSucceeded = true;
          } catch (textShareErr) {
            console.error('Text share fallback failed', textShareErr);
            if (textShareErr.name === 'AbortError' || (textShareErr.message && textShareErr.message.includes('abort'))) {
               setDownloading(false);
               return; // User cancelled
            }
          }
        }
      } 
      
      if (!shareSucceeded) {
        // Since native sharing failed (often fails for files on desktop or some mobile browsers),
        // we'll share just the text with the native API if possible, or fallback to clipboard.
        const textWithLink = shareText + "\n\n" + (language === 'he' ? "קישור להזמנה: " : "Order link: ") + orderUrl;
        
        try {
            if (navigator.share) {
               await navigator.share({
                   title: language === 'he' ? 'הזמנה לספק' : 'Supplier Order',
                   text: textWithLink
               });
            } else {
                throw new Error("No native share api");
            }
        } catch(textErr) {
             if (textErr.name !== 'AbortError' && !(textErr.message && textErr.message.includes('abort'))) {
                 try {
                  await navigator.clipboard.writeText(textWithLink);
                  toast.success(language === 'he' ? 'טקסט ההזמנה והקישור הועתקו ללוח' : 'Order text and link copied!', { duration: 6000 });
                } catch (copyErr) {
                  console.error('Clipboard copy failed', copyErr);
                }
             }
        }

        // Trigger native download of the image as fallback for the missing file in text share
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `order_${safeName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      if (onSend) {
        try { await onSend({ ...order, order_number: ensuredNumber, status: 'sent' }); } catch (_) {}
      }

    } catch (err) {
      console.error('Failed to process image:', err);
      setDownloading(false);
    }
  };



        // Unused handleDownloadJPG removed.

        return (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`bg-white shadow-2xl overflow-hidden flex flex-col w-full ${viewMode === 'mobile' ? 'max-w-[430px] rounded-t-2xl sm:rounded-2xl max-h-[95dvh]' : 'max-w-5xl rounded-t-2xl sm:rounded-xl max-h-[92dvh] sm:max-h-[90vh]'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >


        <div className="flex-1 min-h-0 bg-gray-100 p-2 sm:p-4 overflow-y-auto flex justify-center">
          <div className={`order-preview-embed not-prose bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden ${viewMode === 'mobile' ? 'w-full max-w-sm h-fit' : 'w-full h-fit'}`}>
            <div className="w-full relative">
              <div style={{
                  background: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
                  direction: language === 'he' ? 'rtl' : 'ltr',
                  padding: '24px',
                  minHeight: '100%'
              }}>
                  <div style={{
                      maxWidth: '100%', 
                      margin: '0 auto',
                      backgroundColor: 'white',
                      overflow: 'hidden'
                  }}>
                      {/* Header */}
                      <div style={{
                          background: 'white',
                          color: '#111827',
                          padding: '20px 16px 16px',
                          textAlign: 'center',
                          borderBottom: '1px solid #f3f4f6'
                      }}>
                          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', wordBreak: 'break-word', overflowWrap: 'break-word', letterSpacing: '-0.025em' }}>
                              {order.supplier_name}
                          </h1>
                          <div style={{ display: 'inline-block', background: '#f3f4f6', padding: '4px 12px', borderRadius: '9999px', fontSize: '14px', color: '#4b5563', fontWeight: '500' }}>
                              {language === 'he' ? 'הזמנה' : 'Order'} <span dir="ltr" style={{ display: 'inline-block' }}>#{fallbackNumber}</span>
                          </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '24px' }}>
                          {/* Meta Details */}
                          <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              marginBottom: '20px',
                              fontSize: '14px',
                              color: '#4b5563'
                          }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{language === 'he' ? 'מאת:' : 'From:'}</span>
                                  <span style={{ fontWeight: '600', color: '#111827' }}>{order.restaurant_name}</span>
                              </div>
                              {order.business_tax_id && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{language === 'he' ? 'ח.פ/עוסק:' : 'Business ID:'}</span>
                                      <span style={{ fontWeight: '500', color: '#111827', textAlign: language === 'he' ? 'left' : 'right' }}>{order.business_tax_id}</span>
                                  </div>
                              )}
                              {order.restaurant_address && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{language === 'he' ? 'כתובת:' : 'Address:'}</span>
                                      <span style={{ fontWeight: '500', color: '#111827', textAlign: language === 'he' ? 'left' : 'right' }}>{order.restaurant_address}</span>
                                  </div>
                              )}
                              {order.delivery_date && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span>{language === 'he' ? 'תאריך אספקה:' : 'Delivery:'}</span>
                                      <span style={{ fontWeight: '500', color: '#111827' }}>{new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</span>
                                  </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{language === 'he' ? 'נשלח בתאריך:' : 'Sent At:'}</span>
                                  <span style={{ fontWeight: '500', color: '#111827' }} dir="ltr">{new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')} {new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                          </div>

                          {/* Items List */}
                          <div style={{
                              backgroundColor: 'white',
                              borderRadius: '12px',
                              padding: '0',
                              marginBottom: '20px',
                              border: '1px solid #e5e7eb',
                              overflow: 'hidden'
                          }}>
                              <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                  <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563', margin: '0', textTransform: 'uppercase' }}>
                                      {language === 'he' ? 'פריטים' : 'Items'}
                                  </h2>
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <tbody>
                                      {order.items && order.items.map((item, index) => (
                                          <tr key={index} style={{ borderBottom: index < order.items.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                              <td style={{ padding: '10px 14px', width: '20px', color: '#9ca3af', fontSize: '12px' }}>{index + 1}</td>
                                              <td style={{ padding: '10px 0', fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                                                  {item.item_name || item.item || item.name}
                                                  {item.catalog_number && (
                                                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal', marginTop: '2px' }}>
                                                          {language === 'he' ? 'מק"ט:' : 'SKU:'} {item.catalog_number}
                                                      </div>
                                                  )}
                                              </td>
                                              <td style={{ padding: '10px 14px', textAlign: language === 'he' ? 'left' : 'right' }}>
                                                  <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                                                      <span style={{ fontWeight: '700', color: '#111827', fontSize: '14px' }}>{item.quantity}</span>
                                                      <span style={{ color: '#6b7280', fontSize: '12px' }}>{getUnitLabel(item.unit)}</span>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>

                          {formattedTotal && effectiveTotal > 0 && (
                          <div style={{ 
                              padding: '16px', 
                              backgroundColor: '#f9fafb', 
                              borderRadius: '12px', 
                              border: '1px solid #e5e7eb', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: '24px'
                          }}>
                              <span style={{ fontSize: '15px', fontWeight: 600, color: '#4b5563' }}>
                                  {language === 'he' ? 'סה״כ לתשלום' : 'Total Amount'}
                              </span>
                              <span style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>
                                  ₪{formattedTotal}
                              </span>
                          </div>
                          )}

                          {/* Notes */}
                          {order.notes && (
                              <div style={{
                                  backgroundColor: '#fffbeb',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  marginBottom: '24px',
                                  border: '1px solid #fde68a'
                              }}>
                                  <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                                      {language === 'he' ? 'הערות להזמנה' : 'Notes'}
                                  </h3>
                                  <p style={{ margin: 0, color: '#78350f', fontSize: '14px', lineHeight: '1.5' }}>{order.notes}</p>
                              </div>
                          )}

                          {/* Footer */}
                          <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                              <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/4c53051d0_smartplate_logo_long_big_tp_800x176.png" alt="Smart Plate" style={{ height: '30px', margin: '0 auto 8px' }} />
                              <div style={{ fontSize: '9px', marginTop: '2px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>The ultimate food & labor cost app</div>
                              <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: 600, color: '#2563eb' }}>foodcostapp.com</div>
                          </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)] border-t bg-white sticky bottom-0 z-20 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
          {!hideActions && (
            <div className="flex gap-2 w-full">
              <Button
                onClick={async () => {
                  if (onSendEmail) {
                    setSending(true);
                    try { await onSendEmail(); } catch(e) {}
                    setSending(false);
                  }
                }}
                variant="outline"
                className="flex-1 h-12 text-blue-600 border-blue-200 hover:bg-blue-50 text-[15px]"
                disabled={downloading || sending}
              >
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 ml-1.5" />}
                {safeT('send_email', 'במייל', 'Email')}
              </Button>

              <Button
                onClick={async () => {
                  await handleDownloadImage({ shareOnly: true });
                }}
                className="flex-[1.5] h-12 bg-[#d4a373] hover:bg-[#b88c60] text-white font-medium shadow-sm disabled:opacity-50 text-[15px]"
                disabled={downloading || sending}
                data-testid="order-preview-send"
              >
                {downloading || sending ? <Loader className="w-5 h-5 ml-1.5 animate-spin" /> : <Share className="w-5 h-5 ml-1.5" />}
                {safeT('share_order', 'שתף', 'Share')}
              </Button>
            </div>
          )}
          
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full h-10 text-gray-500 hover:bg-gray-100"
          >
            {hideActions || order?.status !== 'draft' ? safeT('close', 'סגור', 'Close') : safeT('back_to_edit', 'חזור לעריכת הזמנה', 'Back to Edit')}
          </Button>
        </div>
      </motion.div>


    </div>
  );
}