import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../LanguageProvider";
import { Download, Trash2 } from "lucide-react";

export default function ReceiptList({ receipts = [], onEdit, onDelete, loading = false }) {
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

  const statusVariant = (status) => {
    if (status === 'verified') return 'default';
    if (status === 'has_issues') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className={`hidden md:grid grid-cols-8 gap-2 px-4 py-2 text-xs font-semibold text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div>{t('supplier') || 'Supplier'}</div>
        <div>{t('order_number') || 'Order #'}</div>
        <div>{t('invoice_number') || 'Invoice #'}</div>
        <div>{t('received_date') || 'Date'}</div>
        <div>{t('invoice_total') || 'Amount'}</div>
        <div>{t('status') || 'Status'}</div>
        <div>{t('files') || 'Files'}</div>
        <div className={isRTL ? 'text-left' : 'text-right'}>{t('actions') || 'Actions'}</div>
      </div>
      <div className="divide-y">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          receipts.map((r) => (
            <div
              key={r.id}
              className={`px-4 py-3 flex flex-col md:grid md:grid-cols-8 md:items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {/* Supplier + items count (if any) */}
              <div>
                <div className="font-medium">{r.supplier_name || '-'}</div>
                {Array.isArray(r.verified_items) && r.verified_items.length > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {(t('items') || 'Items')}: {r.verified_items.length}
                  </div>
                )}
                {r.notes && (
                  <div className="text-xs text-amber-700 mt-0.5 truncate max-w-[220px]">
                    {(t('notes') || 'Notes')}: {r.notes}
                  </div>
                )}
              </div>

              {/* Order and invoice numbers */}
              <div className="text-sm text-gray-600">{r.order_number || '-'}</div>
              <div className="text-sm text-gray-600">{r.invoice_number || '-'}</div>

              {/* Date */}
              <div className="text-sm">{fmtDate(r.received_date)}</div>

              {/* Amount */}
              <div className="text-sm font-semibold text-blue-700">
                {typeof r.invoice_total !== 'undefined' ? fmtCurrency(r.invoice_total) : '-'}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statusVariant(r.status)}>
                  {t(`status_${r.status}`) || r.status || '-'}
                </Badge>
                {r.is_refund && (
                  <Badge className="bg-purple-100 text-purple-800">{language === 'he' ? 'זיכוי' : 'Refund'}</Badge>
                )}
                {r.needs_review && (
                  <Badge className="bg-amber-100 text-amber-800">{language === 'he' ? 'לבדיקה' : 'Review'}</Badge>
                )}
              </div>

              {/* Files / images */}
              <div>
                {Array.isArray(r.receipt_images) && r.receipt_images.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={r.receipt_images[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block w-12 h-12 rounded-md overflow-hidden border bg-white"
                      title={(t('open_file') || 'Open file')}
                    >
                      {isPdf(r.receipt_images[0]) ? (
                        <embed
                          src={`${r.receipt_images[0]}#toolbar=0&navpanes=0&scrollbar=0`}
                          type="application/pdf"
                          className="w-full h-full pointer-events-none"
                        />
                      ) : (
                        <img src={r.receipt_images[0]} alt="receipt" className="w-full h-full object-cover pointer-events-none" />
                      )}
                      {r.receipt_images.length > 1 && (
                        <span className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-[10px] px-1 rounded-tl">
                          +{r.receipt_images.length - 1}
                        </span>
                      )}
                    </a>
                    <a href={r.receipt_images[0]} download target="_blank" rel="noopener noreferrer" title={t('download') || 'Download'}>
                      <Button size="icon" variant="ghost" aria-label={t('download') || 'Download'}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </div>

              {/* Actions */}
              <div className={`flex md:justify-end ${isRTL ? 'md:justify-start' : ''}`}>
                <Button size="sm" variant="outline" onClick={() => onEdit && onEdit(r)}>
                  {t('edit') || 'Edit'}
                </Button>
                {onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="ml-2"
                    onClick={() => onDelete(r)}
                    title={t('delete') || 'Delete'}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> {t('delete') || 'Delete'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}