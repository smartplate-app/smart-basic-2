import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../LanguageProvider";
import { Download, Trash2, Edit, MoreHorizontal, FileText, Image as ImageIcon, Search, Check, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import PdfThumbnail from "./PdfThumbnail";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ReceiptList({ receipts = [], onEdit, onDelete, onQuickUpdate, loading = false, sortBy, onSortChange, invoiceNumberFilter, onInvoiceNumberFilterChange, statusFilter, onStatusFilterChange }) {
  const { t, language } = useLanguage();
  const isRTL = language?.startsWith('he') || language?.startsWith('ar');

  const fmtDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(language?.startsWith('he') ? 'he-IL' : (language?.startsWith('ar') ? 'ar-IL' : 'en-US'));
    } catch {
      return d;
    }
  };

  const fmtCurrency = (n) => {
    const num = typeof n === 'number' ? n : parseFloat(n || 0);
    return num.toLocaleString(
      language?.startsWith('he') ? 'he-IL' : (language?.startsWith('ar') ? 'ar-IL' : 'en-US'),
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    );
  };

  const isPdf = (url) => typeof url === 'string' && /\.pdf(?:$|\?)/i.test(url);

  const safeT = (key, he, en) => {
    const s = t(key);
    return (!s || s === key) ? (language?.startsWith('he') ? he : (en || key)) : s;
  };

  const [sendingToDokka, setSendingToDokka] = useState(null);

  const handleDownload = async (e, url, defaultFilename) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      
      const isPdfUrl = /\.pdf(?:$|\?)/i.test(url) || blob.type === 'application/pdf';
      
      if (isPdfUrl) {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${defaultFilename}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const imgUrl = window.URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          const orientation = img.width > img.height ? 'l' : 'p';
          const pdf = new jsPDF({
            orientation: orientation,
            unit: 'px',
            format: [img.width, img.height]
          });
          
          pdf.addImage(imgData, 'JPEG', 0, 0, img.width, img.height);
          pdf.save(`${defaultFilename}.pdf`);
          window.URL.revokeObjectURL(imgUrl);
        };
        img.onerror = () => {
          window.URL.revokeObjectURL(imgUrl);
          throw new Error("Failed to load image for PDF conversion");
        };
        img.src = imgUrl;
      }
    } catch (err) {
      console.error('Download failed:', err);
      window.open(url, '_blank');
    }
  };

  const handleSendToDokka = async (e, receipt) => {
    e.stopPropagation();
    e.preventDefault();
    if (!receipt.receipt_images || receipt.receipt_images.length === 0) {
        alert(language === 'he' ? 'אין קובץ מצורף לשלוח' : 'No file attached to send');
        return;
    }
    setSendingToDokka(receipt.id);
    try {
        const { data } = await base44.functions.invoke('sendInvoiceToDokka', { receiptId: receipt.id });
        if (data && data.success) {
            alert(language === 'he' ? 'נשלח בהצלחה ל-DOKKA' : 'Sent to DOKKA successfully');
            if (onQuickUpdate) onQuickUpdate(receipt.id, { dokka_synced: true });
        } else {
            alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + (data?.error || 'Unknown error'));
        }
    } catch (err) {
        alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + err.message);
    } finally {
        setSendingToDokka(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 relative">
      <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[70vh]">
        <table className="w-full relative">
          <thead className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th 
                className="px-4 pt-4 pb-3 text-left rtl:text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none align-top"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'supplier_asc' ? 'supplier_desc' : 'supplier_asc');
                }}
              >
                <div className="flex items-center gap-1 justify-start h-5">
                  {safeT('supplier', 'ספק', 'Supplier')}
                  <span className={`text-[10px] ${sortBy?.startsWith('supplier') ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'supplier_asc' ? '↑' : sortBy === 'supplier_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th className="px-4 pt-3 pb-3 text-left rtl:text-right text-xs font-semibold text-gray-500 align-top">
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-start h-5">{safeT('invoice_number', 'מספר חשבונית', 'Invoice #')}</span>
                  {onInvoiceNumberFilterChange && (
                    <div className="relative w-full min-w-[120px]">
                      <Search className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 ${isRTL ? 'right-2.5' : 'left-2.5'}`} />
                      <input 
                        type="text" 
                        value={invoiceNumberFilter || ''}
                        onChange={(e) => onInvoiceNumberFilterChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={language === 'he' ? 'חיפוש...' : 'Search...'}
                        className={`w-full text-xs h-8 rounded-lg border border-gray-200 bg-white shadow-sm focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all font-normal text-gray-900 ${isRTL ? 'pl-3 pr-8' : 'pr-3 pl-8'}`}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th 
                className="px-4 pt-4 pb-3 text-left rtl:text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none align-top"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'date_desc' ? 'date_asc' : 'date_desc');
                }}
              >
                <div className="flex items-center gap-1 justify-start h-5">
                  {safeT('received_date', 'תאריך קבלה', 'Date')}
                  <span className={`text-[10px] ${sortBy === 'date_asc' || sortBy === 'date_desc' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'date_asc' ? '↑' : sortBy === 'date_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th 
                className="px-4 pt-4 pb-3 text-left rtl:text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none align-top"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'invoice_date_desc' ? 'invoice_date_asc' : 'invoice_date_desc');
                }}
              >
                <div className="flex items-center gap-1 justify-start h-5">
                  {safeT('invoice_date', 'תאריך בחשבונית', 'Invoice Date')}
                  <span className={`text-[10px] ${sortBy === 'invoice_date_asc' || sortBy === 'invoice_date_desc' ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'invoice_date_asc' ? '↑' : sortBy === 'invoice_date_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th 
                className="px-4 pt-4 pb-3 text-left rtl:text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none align-top"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'amount_desc' ? 'amount_asc' : 'amount_desc');
                }}
              >
                <div className="flex items-center justify-start gap-1 h-5">
                  {safeT('invoice_total', 'סכום בחשבונית', 'Amount')}
                  <span className={`text-[10px] ${sortBy?.startsWith('amount') ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'amount_asc' ? '↑' : sortBy === 'amount_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th className="px-4 pt-3 pb-3 text-center text-xs font-semibold text-gray-500 align-top">
                <div className="flex flex-col gap-1.5 items-center">
                  <span className="flex items-center justify-center h-5">{safeT('status', 'סוג מסמך', 'Type')}</span>
                  {onStatusFilterChange && (
                    <select 
                      value={statusFilter || 'all'} 
                      onChange={(e) => onStatusFilterChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[10px] h-8 rounded-lg border border-gray-200 bg-white shadow-sm focus:border-green-500 outline-none w-full max-w-[100px] text-gray-700`}
                    >
                      <option value="all">{language === 'he' ? 'הכל' : 'All'}</option>
                      <option value="invoices">{language === 'he' ? 'חשבוניות' : 'Invoices'}</option>
                      <option value="delivery_notes">{language === 'he' ? 'תעודות' : 'Deliveries'}</option>
                      <option value="refund_invoice">{language === 'he' ? 'זיכויים' : 'Refunds'}</option>
                      <option value="awaiting_credit">{language === 'he' ? 'ממתין' : 'Awaiting'}</option>
                    </select>
                  )}
                </div>
              </th>
              <th className="px-4 pt-4 pb-3 text-center text-xs font-semibold text-gray-500 align-top">
                <div className="flex items-center justify-center h-5">{safeT('files', 'קבצים', 'Files')}</div>
              </th>
              <th className="px-4 pt-4 pb-3 text-left rtl:text-right text-xs font-semibold text-gray-500 align-top">
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-600">{t('loading') || 'טוען...'}</p>
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  {t('no_receipts_to_display') || 'אין קבלות להצגה'}
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEdit && onEdit(r)}
                >
                  <td className="px-6 py-5 text-left rtl:text-right align-middle">
                    <div className="text-base font-bold text-gray-900">{r.supplier_name || '-'}</div>
                    {Array.isArray(r.verified_items) && r.verified_items.length > 0 && (
                      <div className="text-sm text-gray-400 mt-1">
                        {safeT('items', 'פריטים', 'Items')}: {r.verified_items.length}
                      </div>
                    )}
                    {r.notes && (
                      <div className="text-sm text-amber-600 mt-1 truncate max-w-[200px]" title={r.notes}>
                        {r.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                    {r.invoice_number || '-'}
                    {r.order_number && (
                      <div className="text-sm text-gray-400 mt-1">
                        {safeT('order', 'הזמנה', 'Order')}: {r.order_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                    {fmtDate(r.received_date)}
                  </td>
                  <td className="px-6 py-5 text-left rtl:text-right text-base text-gray-600 align-middle">
                    {fmtDate(r.invoice_date)}
                  </td>
                  <td className="px-6 py-5 text-left rtl:text-right text-base font-bold text-gray-900 align-middle">
                    {typeof r.invoice_total !== 'undefined' ? `₪${fmtCurrency(r.invoice_total)}` : '-'}
                  </td>
                  <td className="px-6 py-5 text-center align-middle">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {(() => {
                        const isResolved = r.reviewed || r.refund_received || r.linked_receipt_id;
                        if (isResolved) {
                          return <Badge className="bg-emerald-50 text-emerald-700 border-none font-medium text-[10px] px-1.5 py-0.5 h-auto leading-none flex items-center gap-0.5">{language === 'he' ? 'התקבל' : 'Received'} <Check className="w-2.5 h-2.5" /></Badge>;
                        }
                        return (
                          <>
                            {r.is_refund && (
                              <Badge className="bg-purple-50 text-purple-700 border-none font-medium text-[10px] px-1.5 py-0.5 h-auto leading-none">{safeT('refund', 'זיכוי', 'Refund')}</Badge>
                            )}

                            {r.awaiting_credit && (
                              <Badge className="bg-orange-50 text-orange-700 border-none font-medium text-[10px] px-1.5 py-0.5 h-auto leading-none">{language === 'he' ? 'ממתין לזיכוי' : 'Awaiting credit'}</Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <a
                          href={r.receipt_images[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block w-10 h-10 rounded-xl overflow-hidden border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                          title={(t('open_file') || 'Open file')}
                        >
                          {isPdf(r.receipt_images[0]) ? (
                            <PdfThumbnail url={r.receipt_images[0]} size={40} />
                          ) : (
                            <img src={r.receipt_images[0]} alt="receipt" className="w-full h-full object-cover pointer-events-none" />
                          )}
                          {r.receipt_images.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 rounded-tl-xl font-medium">
                              +{r.receipt_images.length - 1}
                            </span>
                          )}
                        </a>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right rtl:text-left align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 pointer-events-auto">
                      {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && (
                        <button type="button" className="inline-flex" onClick={(e) => handleDownload(e, r.receipt_images[0], `receipt_${r.invoice_number || r.id}`)}>
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-gray-400 hover:text-gray-900 rounded-xl" title={safeT('download', 'הורד', 'Download')}>
                            <Download className="w-5 h-5" />
                          </Button>
                        </button>
                      )}
                      {onDelete && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-600 rounded-xl" onClick={(e) => { e.stopPropagation(); onDelete(r); }} title={safeT('delete', 'מחיקה', 'Delete')}>
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4 p-4 bg-gray-50">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
             <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse border border-gray-100">
               <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
               <div className="flex justify-between">
                 <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                 <div className="h-4 bg-gray-100 rounded w-1/4"></div>
               </div>
             </div>
          ))
        ) : receipts.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            {t('no_receipts_to_display') || 'אין קבלות להצגה'}
          </div>
        ) : (
          receipts.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md cursor-pointer transition-shadow"
              onClick={() => onEdit && onEdit(r)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-gray-900 text-base">{r.supplier_name || '-'}</div>
                  <div className="text-sm text-gray-500 mt-1">{r.invoice_number || '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-700">
                    {typeof r.invoice_total !== 'undefined' ? `₪${fmtCurrency(r.invoice_total)}` : '-'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1" title={language === 'he' ? 'תאריך קבלה' : 'Received Date'}>
                    {language === 'he' ? 'קבלה: ' : 'Rec: '}{fmtDate(r.received_date)}
                  </div>
                  <div className="text-xs text-gray-400" title={language === 'he' ? 'תאריך חשבונית' : 'Invoice Date'}>
                    {language === 'he' ? 'חשבונית: ' : 'Inv: '}{fmtDate(r.invoice_date)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1 flex-wrap">
                  {(() => {
                    const isResolved = r.reviewed || r.refund_received || r.linked_receipt_id;
                    if (isResolved) {
                      return <Badge className="bg-emerald-50 text-emerald-700 border-none font-medium text-[10px] px-1.5 py-0.5 h-auto leading-none flex items-center gap-0.5">{language === 'he' ? 'התקבל' : 'Received'} <Check className="w-2.5 h-2.5" /></Badge>;
                    }
                    return (
                      <>
                        {r.is_refund && (
                          <Badge className="bg-purple-50 text-purple-700 border-none font-medium text-[10px] px-1.5 py-0.5 h-auto leading-none">{safeT('refund', 'זיכוי', 'Refund')}</Badge>
                        )}

                        {r.awaiting_credit && (
                          <Badge className="bg-orange-50 text-orange-700 border-none font-medium text-[10px] px-1.5 py-0.5 h-auto leading-none">{language === 'he' ? 'ממתין לזיכוי' : 'Awaiting credit'}</Badge>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && (
                    <a
                      href={r.receipt_images[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative hover:border-gray-300 transition-colors"
                    >
                      {isPdf(r.receipt_images[0]) ? (
                        <FileText className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      )}
                      {r.receipt_images.length > 1 && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-[9px] text-white font-medium">+{r.receipt_images.length-1}</span>
                        </div>
                      )}
                    </a>
                  )}
                  
                  {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && (
                    <button type="button" className="inline-flex" onClick={(e) => handleDownload(e, r.receipt_images[0], `receipt_${r.invoice_number || r.id}`)}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full bg-gray-50 hover:bg-gray-100 border border-transparent" title={safeT('download', 'הורד', 'Download')}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </button>
                  )}
                  {onDelete && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 rounded-full bg-gray-50 hover:bg-gray-100 border border-transparent" onClick={(e) => { e.stopPropagation(); onDelete(r); }} title={safeT('delete', 'מחיקה', 'Delete')}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}