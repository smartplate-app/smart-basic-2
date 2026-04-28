import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../LanguageProvider";
import { Download, Trash2, Edit, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import PdfThumbnail from "./PdfThumbnail";

export default function ReceiptList({ receipts = [], onEdit, onDelete, onQuickUpdate, loading = false }) {
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

  // Detect PDF by URL extension
  const isPdf = (url) => typeof url === 'string' && /\.pdf(?:$|\?)/i.test(url);
  // (Replaced by real image thumbnails via PdfThumbnail component)

  const statusColors = {
    verified: "bg-green-50 text-green-600",
    has_issues: "bg-red-50 text-red-600",
    pending: "bg-yellow-50 text-yellow-600"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full text-sm">
          <thead className="bg-transparent border-b border-gray-100">
            <tr>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier') || 'Supplier'}</th>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoice_number') || 'Invoice #'}</th>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{t('received_date') || 'Date'}</th>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{t('invoice_total') || 'Amount'}</th>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{t('status') || 'Status'}</th>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>{t('files') || 'Files'}</th>
              <th className={`px-4 py-4 font-semibold text-gray-500 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                  <td className="px-4 py-4"><div className="h-6 bg-gray-100 rounded-full w-20"></div></td>
                  <td className="px-4 py-4"><div className="h-8 bg-gray-200 rounded w-8"></div></td>
                  <td className="px-4 py-4"><div className="h-8 bg-gray-100 rounded w-8 ml-auto"></div></td>
                </tr>
              ))
            ) : receipts.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                  {t('no_receipts_to_display') || 'No receipts to display'}
                </td>
              </tr>
            ) : (
              receipts.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => onEdit && onEdit(r)}>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="font-semibold text-gray-900">{r.supplier_name || '-'}</div>
                    {(Array.isArray(r.verified_items) && r.verified_items.length > 0) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.verified_items.length} {t('items') || 'Items'}
                      </div>
                    )}
                    {r.notes && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate max-w-[200px]">
                        {r.notes}
                      </div>
                    )}
                  </td>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {r.invoice_number || '-'}
                    {r.order_number && (
                      <div className="text-xs text-gray-400 mt-0.5">{r.order_number}</div>
                    )}
                  </td>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {fmtDate(r.received_date)}
                  </td>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {typeof r.invoice_total !== 'undefined' ? `₪${fmtCurrency(r.invoice_total)}` : '-'}
                  </td>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {t(`status_${r.status}`) || r.status || '-'}
                      </span>
                      {r.is_refund && (
                        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-600">
                          {t('refund') || 'Refund'}
                        </span>
                      )}
                      {r.needs_review && (
                        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600">
                          {language === 'he' ? 'לבדיקה' : 'Review'}
                        </span>
                      )}
                      {r.linked_receipt_id && (
                        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
                          {language === 'he' ? 'מקושר' : 'Linked'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`} onClick={(e) => e.stopPropagation()}>
                    {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={r.receipt_images[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors"
                          title={(t('open_file') || 'Open file')}
                        >
                          {isPdf(r.receipt_images[0]) ? (
                            <PdfThumbnail url={r.receipt_images[0]} size={40} />
                          ) : (
                            <img src={r.receipt_images[0]} alt="receipt" className="w-full h-full object-cover pointer-events-none" />
                          )}
                          {r.receipt_images.length > 1 && (
                            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 rounded-tl-md font-medium backdrop-blur-sm">
                              +{r.receipt_images.length - 1}
                            </span>
                          )}
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className={`px-4 py-4 align-middle whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`} onClick={(e) => e.stopPropagation()}>
                    <div className={`flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-900 rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(r)}>
                              <Edit className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                              {t('edit') || 'Edit'}
                            </DropdownMenuItem>
                          )}
                          {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 && (
                            <DropdownMenuItem onClick={() => window.open(r.receipt_images[0], '_blank')}>
                              <Download className="w-4 h-4 rtl:ml-2 ltr:mr-2 text-gray-500" />
                              {t('download') || 'Download'}
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
                                {t('delete') || 'Delete'}
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
    </div>
  );
}