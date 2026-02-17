import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Smartphone, Monitor, Copy, Check, Download, Mail, MessageCircle } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import { createPageUrl } from '@/utils';
import html2canvas from 'html2canvas';
import { base44 } from '@/api/base44Client';

export default function OrderPreviewModal({ order, isOpen, onClose, onSend }) {
  const { t, language } = useLanguage();
  const safeT = (key, he, en) => {
    const v = t(key);
    if (language === 'he' && (v === key || !v)) return he;
    return (v === key || !v) ? (en ?? key) : v;
  };
  const [viewMode, setViewMode] = useState('mobile');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const urlRef = useRef('');
  const [shareFile, setShareFile] = useState(null);

  useEffect(() => {
    let disposed = false;
    async function gen() {
      try {
        if (!isOpen || !order) { setShareFile(null); return; }
        const temp = document.createElement('div');
        temp.style.position='fixed'; temp.style.left='-9999px'; temp.style.top='0';
        temp.style.width='1024px'; temp.style.background='#fff'; temp.style.padding='24px';
        temp.style.fontFamily='system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        temp.style.direction=(language==='he'?'rtl':'ltr');
        const items = (order.items||[]).slice(0,12).map((it,i)=>`<tr><td style="padding:6px;border-bottom:1px solid #e5e7eb">${i+1}</td><td style="padding:6px;border-bottom:1px solid #e5e7eb">${it.item_name||it.name||''}</td><td style="padding:6px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669">${it.quantity||''}</td><td style="padding:6px;border-bottom:1px solid #e5e7eb">${it.unit||''}</td></tr>`).join('');
        const ensuredNumber = order.order_number || `ORD-${(order.id||Date.now()).toString().slice(-8)}`;
        temp.innerHTML = `<div style="font-weight:800;margin-bottom:8px">${t('order_preview') || 'Order'} #${ensuredNumber}</div><div>${t('supplier') || 'Supplier'}: ${order.supplier_name||''}</div><div style="margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;padding:10px"><table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>${items}</tbody></table></div>`;
        document.body.appendChild(temp);
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(temp,{scale:2.4,backgroundColor:'#ffffff',logging:false,useCORS:true});
        const blob = await new Promise(res=>canvas.toBlob(res,'image/png',1.0));
        document.body.removeChild(temp);
        if (disposed) return;
        if (blob) {
          const file = new File([blob], `order-${ensuredNumber}.png`, { type: 'image/png' });
          setShareFile(file);
        } else {
          setShareFile(null);
        }
      } catch { setShareFile(null); }
    }
    gen();
    return () => { disposed = true; };
  }, [isOpen, order, language]);
  
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
    i: (order.items || []).map(it => ({ n: (it.item_name || it.item || it.name || ''), q: it.quantity, u: (it.unit || it.u || '') })),
    t: order.notes,
    m: effectiveTotal
  };
  const orderData = encodeURIComponent(JSON.stringify(minimalOrder));
  if (!urlRef.current) {
    if (order.id) {
      const qs = `id=${order.id}&d=${orderData}`;
      urlRef.current = `${window.location.origin}${createPageUrl(`PublicOrder?${qs}`)}`;
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

  // deprecated in favor of parent-controlled chooser
  const handleDownloadImage = async (opts = {}) => {
          const shareOnly = !!opts.shareOnly;
    try {
      setDownloading(true);

      // Ensure order number exists; if missing, persist and mark as sent when appropriate
      let ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
      try {
        if (!order.order_number && order.id) {
          await base44.entities.Order.update(order.id, {
            order_number: ensuredNumber,
            status: order.status === 'draft' ? 'sent' : (order.status || 'sent')
          });
          order.order_number = ensuredNumber;
        }
      } catch (_) {}

      // Notify parent to ensure list refresh and service-role update for sub-users
      if (onSend) {
        try { await onSend({ ...order, order_number: ensuredNumber, status: 'sent' }); } catch (_) {}
      }

      // Removed early link-sharing on mobile; always generate image first and share the JPG file instead


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
            ${language === 'he' ? 'הזמנה' : 'Order'} #${ensuredNumber}
          </h1>
          <p style="font-size: 16px; opacity: 0.9; margin: 0;">
            ${language === 'he' ? 'ספק:' : 'Supplier:'} ${order.supplier_name}
          </p>
          ${order.delivery_date ? `<p style="font-size: 14px; margin: 8px 0 0 0; opacity: 0.95;">📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</p>` : ''}
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #e2e8f0;">
          <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 12px 0;">
            ${language === 'he' ? 'פרטי העסק' : 'Business Details'}
          </h2>
          <p style="margin: 8px 0; font-size: 16px;"><strong>🏢 ${order.restaurant_name}</strong></p>
          ${order.restaurant_address ? `<p style="margin: 8px 0; font-size: 14px; color: #64748b;">📍 ${order.restaurant_address}</p>` : ''}
        </div>

        <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 2px solid #fbbf24; text-align: center;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
            📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US') : (language === 'he' ? 'לא צוין' : 'Not specified')}
          </p>
        </div>

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

         <div style="background: #ecfeff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 2px solid #06b6d4; text-align: center;">
           <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0e7490;">
             ${language === 'he' ? 'סה״כ הזמנה:' : 'Order Total:'} ₪${formattedTotal}
           </p>
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
      html2canvas(tempContainer, {
        scale: shareOnly ? 1 : 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      }).then((canvas) => {
        // Remove temp container
        document.body.removeChild(tempContainer);
        // Convert to blob and try to copy to clipboard (improved: JPEG then PNG)
        canvas.toBlob(async (jpegBlob) => {
          const number = ensuredNumber;
          const file = new File([jpegBlob], `order-${number}.jpg`, { type: 'image/jpeg' });
        }, 'image/jpeg', 0.95);
        });

        /* removed duplicate catch placement to close .then */

        /* Continue inside updated flow */
        // OLD block replaced below
        return;
        const isIOSiPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || isIOSiPad;

        // Mobile/iPad: ALWAYS use native app chooser when available; never open browser
        if (isMobile && navigator.share) {
          try {
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              setDownloading(false);
              await navigator.share({ files: [file], title: `${language === 'he' ? 'הזמנה' : 'Order'} #${number}` });
              return;
            } else {
              // Some Safari versions can't share files — show guidance instead of sending a link
              setDownloading(false);
              return;
            }
          } catch (_) { /* fallthrough to download */ }
        }

        // Desktop devices: save the JPG for manual attach
        if (!isMobile) {
          const url = window.URL.createObjectURL(jpegBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `order-${number}.jpg`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          setDownloading(false);
          return;
        }

        // Mobile without Web Share support: show guidance (no forced download to avoid browser prompt)
        try {
          alert(language === 'he'
            ? 'בשיתוף דרך הדפדפן: השתמש בכפתור השיתוף של Safari (הריבוע עם החץ) כדי לבחור אפליקציה.'
            : 'Sharing from browser: use Safari’s Share button (square with up arrow) to choose an app.');
        } catch (_) {}
        setDownloading(false);
        return;
      }, 'image/jpeg', 0.95);

    } catch (err) {
      console.error('Failed to process image:', err);
      setDownloading(false);
    }
  };



        const handleDownloadJPG = async () => {
          try {
            setDownloading(true);
            const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'fixed';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            tempContainer.style.width = '800px';
            tempContainer.style.background = 'white';
            tempContainer.style.padding = '40px';
            tempContainer.style.fontFamily = 'system-ui, sans-serif';
            tempContainer.style.direction = language === 'he' ? 'rtl' : 'ltr';

            tempContainer.innerHTML = `
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 32px; text-align: center; border-radius: 16px 16px 0 0; margin: -40px -40px 20px -40px;">
                <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0;">
                  ${language === 'he' ? 'הזמנה' : 'Order'} #${ensuredNumber}
                </h1>
                <p style="font-size: 16px; opacity: 0.9; margin: 0;">
                  ${language === 'he' ? 'ספק:' : 'Supplier:'} ${order.supplier_name}
                </p>
                ${order.delivery_date ? `<p style="font-size: 14px; margin: 8px 0 0 0; opacity: 0.95;">📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</p>` : ''}
              </div>

              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #e2e8f0;">
                <h2 style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0 0 12px 0;">
                  ${language === 'he' ? 'פרטי העסק' : 'Business Details'}
                </h2>
                <p style="margin: 8px 0; font-size: 16px;"><strong>🏢 ${order.restaurant_name}</strong></p>
                ${order.restaurant_address ? `<p style="margin: 8px 0; font-size: 14px; color: #64748b;">📍 ${order.restaurant_address}</p>` : ''}
              </div>

              <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 2px solid #fbbf24; text-align: center;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">
                  📅 ${language === 'he' ? 'תאריך אספקה:' : 'Delivery Date:'} ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US') : (language === 'he' ? 'לא צוין' : 'Not specified')}
                </p>
              </div>

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

               <div style="background: #ecfeff; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 2px solid #06b6d4; text-align: center;">
                 <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0e7490;">
                   ${language === 'he' ? 'סה״כ הזמנה:' : 'Order Total:'} ₪${formattedTotal}
                 </p>
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

            html2canvas(tempContainer, {
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false,
              useCORS: true
            }).then((canvas) => {
              document.body.removeChild(tempContainer);
              canvas.toBlob(async (blob) => {
              const number = ensuredNumber;
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `order-${number}.jpg`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
              setDownloading(false);
            }, 'image/jpeg', 0.95);

          } catch (err) {
            console.error('Failed to download image:', err);
            setDownloading(false);
          }
        };

        const handleOpenEmail = (e) => { if (e && e.preventDefault) e.preventDefault();
          const to = order.supplier_email || '';
          const subject = encodeURIComponent(`${language === 'he' ? 'הזמנה' : 'Order'} #${fallbackNumber}`);
          const body = encodeURIComponent(`${language === 'he' ? 'שלום, מצורפת ההזמנה:' : 'Hello, here is the order:'}\n${orderUrl}`);
          const href = `mailto:${to}?subject=${subject}&body=${body}`;
          const a = document.createElement('a');
          a.href = href;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          a.remove();
        };

        const handleShareWhatsApp = async (e) => { if (e && e.preventDefault) e.preventDefault();
          const ua = navigator.userAgent || '';
          const isIOSiPad = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
          const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || isIOSiPad;

          const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
          const number = ensuredNumber;
          const text = `${language === 'he' ? 'שלום, הזמנה חדשה.' : 'Hello, new order.'}\n${language === 'he' ? 'מספר הזמנה' : 'Order'}: ${number}`;

          const file = shareFile;
          const inIframe = (()=>{ try { return window.top !== window.self; } catch { return true; } })();
          const canFileShare = !!(file && navigator.canShare && (()=>{ try { return navigator.canShare({ files: [file] }); } catch { return false; } })());

          // If running inside the builder preview (iframe), avoid navigator.share and use a new-tab wa.me link to break out
          const rawPhone0 = String(order.supplier_phone || '').trim();
          let phone0 = rawPhone0.replace(/[^\d+]/g, ''); if (phone0.startsWith('+')) phone0 = phone0.slice(1); if (phone0.startsWith('00')) phone0 = phone0.slice(2);
          const waWeb0 = phone0 ? `https://wa.me/${encodeURIComponent(phone0)}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;

          if (inIframe) {
            const a = document.createElement('a');
            a.href = waWeb0; a.target = '_blank'; a.rel = 'noopener noreferrer';
            document.body.appendChild(a); a.click(); a.remove();
            if (onClose) onClose();
            return;
          }

          if (navigator.share) {
            try {
              navigator.share(canFileShare ? { files: [file], text, title: `${t('order_preview') || 'Order'} #${number}` } : { text, title: `${t('order_preview') || 'Order'} #${number}` });
              if (onClose) onClose();
              return;
            } catch (_) { /* fall through to WA link */ }
          }

          const rawPhone = String(order.supplier_phone || '').trim();
          let phone = rawPhone.replace(/[^\d+]/g, ''); if (phone.startsWith('+')) phone = phone.slice(1); if (phone.startsWith('00')) phone = phone.slice(2);
          const deepLink = phone ? `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}` : `whatsapp://send?text=${encodeURIComponent(text)}`;
          const waWeb = phone ? `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
          // Open in-app first, then ensure Web fallback shortly after for desktop
          try { window.location.href = deepLink; } catch {}
          setTimeout(() => {
            const a2 = document.createElement('a'); a2.href = waWeb; a2.target = '_blank'; a2.rel = 'noopener noreferrer'; document.body.appendChild(a2); a2.click(); a2.remove();
          }, 450);
          if (onClose) onClose();

          if (isMobile && navigator.share) {
            // Use existing generator to create an image and invoke native share
            handleDownloadImage({ shareOnly: true });
            return;
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
            {effectiveTotal > 0 && (
              <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                ₪{formattedTotal}
              </div>
            )}
            <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('mobile')}
                className="gap-2"
              >
                <Smartphone className="w-4 h-4" />
                {safeT('mobile','מובייל','Mobile')}
              </Button>
              <Button
                variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('desktop')}
                className="gap-2"
              >
                <Monitor className="w-4 h-4" />
                {safeT('desktop','דסקטופ','Desktop')}
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 bg-gray-100 p-4 overflow-auto pb-28 md:pb-24" aria-busy={!frameLoaded} aria-live="polite" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className={`order-preview-embed not-prose mx-auto bg-white shadow-lg ${viewMode === 'mobile' ? 'max-w-[375px]' : 'w-full'}`}>
            <div className={`${viewMode === 'mobile' ? 'h-[667px]' : 'h-[600px]'} w-full relative`}>
              {!frameLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                </div>
              )}
              <iframe
                src={orderUrl}
                className="w-full h-full border-0 [image-rendering:auto] [text-rendering:optimizeLegibility]"
                title={t('order_preview')}
                sandbox="allow-same-origin allow-scripts"
                style={{ backgroundColor: '#ffffff', opacity: frameLoaded ? 1 : 0, willChange: 'opacity', pointerEvents: frameLoaded ? 'auto' : 'none', zIndex: 0 }}
                onLoad={() => setFrameLoaded(true)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t bg-white/95 sticky bottom-0 z-50 pointer-events-auto" onClickCapture={(e)=>e.stopPropagation()} onMouseDownCapture={(e)=>e.stopPropagation()} onTouchStartCapture={(e)=>e.stopPropagation()}>
          <Button type="button" onClick={onClose} variant="outline">
            {safeT('close','סגור','Close')}
          </Button>

          <Button type="button" onClick={handleOpenEmail} variant="outline" className="gap-2">
            <Mail className="w-4 h-4" /> {safeT('send_email','שלח באימייל','Send via Email')}
          </Button>

          <Button type="button" onClick={handleShareWhatsApp} className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white">
            <MessageCircle className="w-4 h-4" /> {safeT('send_whatsapp','שלח בוואטסאפ','Send via WhatsApp')}
          </Button>

          <Button type="button" onClick={handleDownloadJPG} variant="outline" className="gap-2" disabled={downloading}>
            <Download className="w-4 h-4" /> {safeT('download_image','הורד תמונה','Download JPG')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}