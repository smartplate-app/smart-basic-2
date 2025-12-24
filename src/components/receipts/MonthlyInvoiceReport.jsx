import React, { useMemo, useState } from "react";
import moment from "moment";
import { useLanguage } from "../LanguageProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MonthlyInvoiceReport({ receipts = [], suppliers = [] }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [month, setMonth] = useState(() => moment().format('YYYY-MM'));
  const [selected, setSelected] = useState(null);

  const supplierById = useMemo(() => {
    const map = {};
    suppliers.forEach(s => { map[s.id] = s; });
    return map;
  }, [suppliers]);

  const monthStart = useMemo(() => moment(month + '-01').startOf('month'), [month]);
  const monthEnd = useMemo(() => moment(month + '-01').endOf('month'), [month]);

  const monthReceipts = useMemo(() => {
    return (receipts || []).filter(r => {
      const dateStr = r.invoice_date || r.received_date;
      if (!dateStr) return false;
      const d = moment(dateStr, [moment.ISO_8601, 'YYYY-MM-DD', 'DD/MM/YYYY']);
      return d.isValid() && d.isBetween(monthStart, monthEnd, undefined, '[]');
    }).sort((a, b) => (a.invoice_date || a.received_date || '').localeCompare(b.invoice_date || b.received_date || ''));
  }, [receipts, monthStart, monthEnd]);

  const grouped = useMemo(() => {
    const map = {};
    monthReceipts.forEach(r => {
      const key = r.supplier_id || 'unknown';
      if (!map[key]) map[key] = { supplier_id: key, supplier_name: r.supplier_name || supplierById[key]?.name || t('unknown') || 'Unknown', receipts: [], total: 0 };
      map[key].receipts.push(r);
      map[key].total += Number(r.invoice_total || 0);
    });
    return Object.values(map).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  }, [monthReceipts, supplierById, t]);

  const grandTotal = useMemo(() => grouped.reduce((sum, g) => sum + g.total, 0), [grouped]);

  return (
    <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('monthly_report') || 'Monthly Report'}</span>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">{t('month') || 'Month'}</label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className={`border p-2 text-xs font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('supplier') || 'Supplier'}</th>
                  <th className="border p-2 text-xs font-semibold">{t('invoice_number') || 'Invoice #'}</th>
                  <th className="border p-2 text-xs font-semibold">{t('invoice_date') || 'Date'}</th>
                  <th className="border p-2 text-xs font-semibold">{t('invoice_total') || 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 && (
                  <tr>
                    <td className="border p-4 text-center text-gray-500" colSpan={4}>
                      {t('no_receipts_to_display') || 'No receipts to display'}
                    </td>
                  </tr>
                )}

                {grouped.map(group => (
                  <React.Fragment key={group.supplier_id}>
                    <tr className="bg-emerald-50">
                      <td className="border p-2 font-semibold">{group.supplier_name}</td>
                      <td className="border p-2 text-sm text-gray-600" colSpan={2}>{t('total') || 'Total'}</td>
                      <td className="border p-2 font-bold text-emerald-700">₪{group.total.toFixed(2)}</td>
                    </tr>
                    {group.receipts.map(r => (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onDoubleClick={() => setSelected(r)}
                        title={t('double_click_to_view') || 'Double click to view'}
                      >
                        <td className="border p-2 text-sm">{group.supplier_name}</td>
                        <td className="border p-2 text-sm font-medium">{r.invoice_number || '-'}</td>
                        <td className="border p-2 text-sm">{moment(r.invoice_date || r.received_date).format('DD/MM/YYYY')}</td>
                        <td className="border p-2 text-sm">₪{Number(r.invoice_total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {grouped.length > 0 && (
                  <tr className="bg-purple-50">
                    <td className="border p-2 font-bold">{t('grand_total') || 'Grand Total'}</td>
                    <td className="border p-2" colSpan={2}></td>
                    <td className="border p-2 font-bold text-purple-700">₪{grandTotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {(t('invoice') || 'Invoice') + ': '}{selected?.invoice_number || '-'} • {selected?.supplier_name || ''}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-600">{t('invoice_date') || 'Date'}</div>
                  <div className="font-medium">{moment(selected.invoice_date || selected.received_date).format('DD/MM/YYYY')}</div>
                </div>
                <div>
                  <div className="text-gray-600">{t('invoice_total') || 'Total'}</div>
                  <div className="font-bold text-emerald-700">₪{Number(selected.invoice_total || 0).toFixed(2)}</div>
                </div>
              </div>

              {Array.isArray(selected.receipt_images) && selected.receipt_images.length > 0 ? (
                <div>
                  <div className="text-sm font-semibold mb-2">{t('scanned_images') || 'Scanned Images'}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selected.receipt_images.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                        <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-32 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">{t('no_scanned_images') || 'No scanned images available.'}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}