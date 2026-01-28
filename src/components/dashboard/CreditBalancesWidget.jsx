import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CheckCircle2, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { useLanguage } from "../LanguageProvider";

export default function CreditBalancesWidget() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalCredits: 0, pendingCredits: 0, overdueCount: 0, recent: [] });

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const workingEmail = me.acting_as_store_email || me.email;
        const receipts = await base44.entities.SupplyReceipt.filter({ created_by: workingEmail });
        const refunds = (receipts || []).filter(r => r.is_refund);
        const totalCredits = refunds.reduce((s, r) => s + (Number(r.invoice_total || r.calculated_total || 0)), 0);
        const pending = refunds.filter(r => !r.refund_received);
        const pendingCredits = pending.reduce((s, r) => s + (Number(r.invoice_total || r.calculated_total || 0)), 0);
        const overdueCount = pending.filter(r => moment().diff(moment(r.received_date), 'days') > 30).length;
        const recent = refunds.sort((a,b) => new Date(b.received_date) - new Date(a.received_date)).slice(0,5);
        setData({ totalCredits, pendingCredits, overdueCount, recent });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtCurrency = (n) => new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          {language === 'he' ? 'יתרות זיכוי' : 'Credit Balances'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-600"><Loader2 className="w-4 h-4 animate-spin" /> {language === 'he' ? 'טוען...' : 'Loading...'}</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-500">{language === 'he' ? 'סה"כ זיכויים' : 'Total Credits'}</div>
                <div className="text-xl font-bold">{fmtCurrency(data.totalCredits)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{language === 'he' ? 'ממתינים' : 'Pending'}</div>
                <div className="text-xl font-bold">{fmtCurrency(data.pendingCredits)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{language === 'he' ? 'באיחור (+30 ימים)' : 'Overdue (+30d)'}</div>
                <div className="text-xl font-bold">{data.overdueCount}</div>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {data.recent.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <div className="truncate">
                    <div className="font-medium truncate max-w-[180px]">{r.supplier_name || '-'}</div>
                    <div className="text-xs text-gray-500">{r.invoice_number || r.order_number || ''} • {r.received_date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">{fmtCurrency(Number(r.invoice_total || r.calculated_total || 0))}</Badge>
                    {r.refund_received ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}