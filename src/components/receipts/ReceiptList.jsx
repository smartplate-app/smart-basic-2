import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../LanguageProvider";
import { Download, Trash2, Edit, MoreHorizontal, FileText, Image as ImageIcon, Search } from "lucide-react";
import PdfThumbnail from "./PdfThumbnail";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function ReceiptList({ receipts = [], onEdit, onDelete, onQuickUpdate, loading = false, sortBy, onSortChange, invoiceNumberFilter, onInvoiceNumberFilterChange }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';

  const fmtDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(language === 'he' ? 'he-IL' : (language === 'ar' ? 'ar-IL' : 'en-US'));
    } catch {
      return d;
    }
  };

  const fmtCurrency = (n) => {
    const num = typeof n === 'number' ? n : parseFloat(n || 0);
    return num.toLocaleString(
      language === 'he' ? 'he-IL' : (language === 'ar' ? 'ar-IL' : 'en-US'),
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    );
  };

  const isPdf = (url) => typeof url === 'string' && /\.pdf(?:$|\?)/i.test(url);

  const statusVariant = (status) => {
    if (status === 'verified') return 'default';
    if (status === 'has_issues') return 'destructive';
    return 'secondary';
  };

  const safeT = (key, he, en) => {
    const s = t(key);
    return (!s || s === key) ? (language === 'he' ? he : (en || key)) : s;
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 relative">
      <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] max-h-[70vh]">
        <table className="w-full relative">
          <thead className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th 
                className="px-4 py-4 text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'supplier_asc' ? 'supplier_desc' : 'supplier_asc');
                }}
              >
                <div className="flex items-center gap-1 justify-start rtl:justify-end">
                  {safeT('supplier', 'ספק', 'Supplier')}
                  <span className={`text-[10px] ${sortBy?.startsWith('supplier') ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'supplier_asc' ? '↑' : sortBy === 'supplier_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 align-top">
                <div className="flex flex-col gap-1.5 mt-2">
                  <span>{safeT('invoice_number', 'מספר חשבונית', 'Invoice #')}</span>
                  {onInvoiceNumberFilterChange && (
                    <div className="relative max-w-[130px]">
                      <Search className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 ${isRTL ? 'right-2' : 'left-2'}`} />
                      <input 
                        type="text" 
                        value={invoiceNumberFilter || ''}
                        onChange={(e) => onInvoiceNumberFilterChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={language === 'he' ? 'חיפוש...' : 'Search...'}
                        className={`w-full text-xs h-7 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all font-normal text-gray-900 ${isRTL ? 'pl-2 pr-7' : 'pr-2 pl-7'}`}
                      />
                    </div>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-4 text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'date_desc' ? 'date_asc' : 'date_desc');
                }}
              >
                <div className="flex items-center gap-1 justify-start rtl:justify-end">
                  {safeT('received_date', 'תאריך קבלה', 'Date')}
                  <span className={`text-[10px] ${sortBy?.startsWith('date') ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'date_asc' ? '↑' : sortBy === 'date_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th 
                className="px-4 py-4 text-right text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 transition-colors select-none"
                onClick={() => {
                  if (onSortChange) onSortChange(sortBy === 'amount_desc' ? 'amount_asc' : 'amount_desc');
                }}
              >
                <div className="flex items-center justify-end gap-1">
                  {safeT('invoice_total', 'סכום בחשבונית', 'Amount')}
                  <span className={`text-[10px] ${sortBy?.startsWith('amount') ? 'text-gray-900' : 'text-gray-400'}`}>
                    {sortBy === 'amount_asc' ? '↑' : sortBy === 'amount_desc' ? '↓' : '⇅'}
                  </span>
                </div>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500">
                {safeT('status', 'סטטוס', 'Status')}
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500">
                {safeT('files', 'קבצים', 'Files')}
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500">
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-gray-600">{t('loading') || 'טוען...'}</p>
                </td>
              </tr>
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                  {t('no_receipts_to_display') || 'אין קבלות להצגה'}
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => onEdit && onEdit(r)}
                >
                  <td className="px-4 py-4 text-right align-middle">
                    <div className="text-sm font-semibold text-gray-900">{r.supplier_name || '-'}</div>
                    {Array.isArray(r.verified_items) && r.verified_items.length > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {safeT('items', 'פריטים', 'Items')}: {r.verified_items.length}
                      </div>
                    )}
                    {r.notes && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate max-w-[200px]" title={r.notes}>
                        {r.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-gray-500 align-middle">
                    {r.invoice_number || '-'}
                    {r.order_number && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {safeT('order', 'הזמנה', 'Order')}: {r.order_number}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-gray-600 align-middle">
                    {fmtDate(r.received_date)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold text-blue-700 align-middle">
                    {typeof r.invoice_total !== 'undefined' ? `₪${fmtCurrency(r.invoice_total)}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-right align-middle">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`border-none ${statusVariant(r.status) === 'default' ? 'bg-green-50 text-green-700' : statusVariant(r.status) === 'destructive' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t(`status_${r.status}`) || r.status || '-'}
                      </Badge>
                      {r.is_refund && (
                        <Badge className="bg-purple-50 text-purple-700 border-none font-normal">{safeT('refund', 'זיכוי', 'Refund')}</Badge>
                      )}
                      {r.needs_review && (
                        <Badge className="bg-amber-50 text-amber-700 border-none font-normal">{language === 'he' ? 'לבדיקה' : 'Review'}</Badge>
                      )}
                      {r.linked_receipt_id && (
                        <Badge className="bg-blue-50 text-blue-700 border-none font-normal">{language === 'he' ? 'מקושר' : 'Linked'}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                    {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={r.receipt_images[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block w-10 h-10 rounded-md overflow-hidden border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                          title={(t('open_file') || 'Open file')}
                        >
                          {isPdf(r.receipt_images[0]) ? (
                            <PdfThumbnail url={r.receipt_images[0]} size={40} />
                          ) : (
                            <img src={r.receipt_images[0]} alt="receipt" className="w-full h-full object-cover pointer-events-none" />
                          )}
                          {r.receipt_images.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-sm text-white text-[9px] px-1 rounded-tl-md font-medium">
                              +{r.receipt_images.length - 1}
                            </span>
                          )}
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-left align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2 pointer-events-auto">
                      {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && (
                        <a href={r.receipt_images[0]} download target="_blank" rel="noopener noreferrer" className="inline-flex">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-lg" title={safeT('download', 'הורד', 'Download')}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-40">
                          <DropdownMenuItem onClick={() => onEdit && onEdit(r)}>
                            <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                            {safeT('edit', 'עריכה', 'Edit')}
                          </DropdownMenuItem>
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onDelete(r)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                                {safeT('delete', 'מחיקה', 'Delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                  <div className="text-xs text-gray-400 mt-1">{fmtDate(r.received_date)}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={`border-none text-xs font-semibold px-2 py-0.5 ${statusVariant(r.status) === 'default' ? 'bg-green-50 text-green-700' : statusVariant(r.status) === 'destructive' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                    {t(`status_${r.status}`) || r.status || '-'}
                  </Badge>
                  {r.is_refund && (
                    <Badge className="bg-purple-50 text-purple-700 border-none font-medium text-xs px-2 py-0.5">{safeT('refund', 'זיכוי', 'Refund')}</Badge>
                  )}
                  {r.needs_review && (
                    <Badge className="bg-amber-50 text-amber-700 border-none font-medium text-xs px-2 py-0.5">{language === 'he' ? 'לבדיקה' : 'Review'}</Badge>
                  )}
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
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-full bg-gray-50 hover:bg-gray-100 border border-transparent">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                      <DropdownMenuItem onClick={() => onEdit && onEdit(r)}>
                        <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                        {safeT('edit', 'עריכה', 'Edit')}
                      </DropdownMenuItem>
                      {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && (
                        <DropdownMenuItem onClick={() => window.open(r.receipt_images[0], '_blank')}>
                          <Download className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                          {safeT('download', 'הורד', 'Download')}
                        </DropdownMenuItem>
                      )}
                      {(r.is_refund || r.needs_review) && <DropdownMenuSeparator />}
                      {r.is_refund && (
                        <DropdownMenuItem onClick={(e) => {
                          e.preventDefault();
                          if (onQuickUpdate) onQuickUpdate(r.id, { refund_received: !r.refund_received });
                        }}>
                          <div className="flex items-center justify-between w-full">
                            <span>{language === 'he' ? 'זיכוי התקבל' : 'Credit received'}</span>
                            <input type="checkbox" checked={!!r.refund_received} readOnly className="pointer-events-none accent-purple-600 rounded" />
                          </div>
                        </DropdownMenuItem>
                      )}
                      {r.needs_review && (
                        <DropdownMenuItem onClick={(e) => {
                          e.preventDefault();
                          if (onQuickUpdate) onQuickUpdate(r.id, { reviewed: !r.reviewed });
                        }}>
                          <div className="flex items-center justify-between w-full">
                            <span>{language === 'he' ? 'נבדק' : 'Reviewed'}</span>
                            <input type="checkbox" checked={!!r.reviewed} readOnly className="pointer-events-none accent-amber-600 rounded" />
                          </div>
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onDelete(r)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4 rtl:ml-2 ltr:mr-2" />
                            {safeT('delete', 'מחיקה', 'Delete')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}