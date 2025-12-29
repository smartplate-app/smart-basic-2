import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../LanguageProvider";

export default function ReceiptList({ receipts = [], onEdit, loading = false }) {
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

  const statusVariant = (status) => {
    if (status === 'verified') return 'default';
    if (status === 'has_issues') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className={`hidden md:grid grid-cols-6 gap-2 px-4 py-2 text-xs font-semibold text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div>{t('supplier') || 'Supplier'}</div>
        <div>{t('order_number') || 'Order #'}</div>
        <div>{t('invoice_number') || 'Invoice #'}</div>
        <div>{t('received_date') || 'Date'}</div>
        <div>{t('status') || 'Status'}</div>
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
              className={`px-4 py-3 flex flex-col md:grid md:grid-cols-6 md:items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <div className="font-medium">{r.supplier_name || '-'}</div>
              <div className="text-sm text-gray-600">{r.order_number || '-'}</div>
              <div className="text-sm text-gray-600">{r.invoice_number || '-'}</div>
              <div className="text-sm">{fmtDate(r.received_date)}</div>
              <div>
                <Badge variant={statusVariant(r.status)}>
                  {t(`status_${r.status}`) || r.status || '-'}
                </Badge>
              </div>
              <div className={`flex md:justify-end ${isRTL ? 'md:justify-start' : ''}`}>
                <Button size="sm" variant="outline" onClick={() => onEdit && onEdit(r)}>
                  {t('edit') || 'Edit'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}