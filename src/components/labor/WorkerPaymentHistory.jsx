import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function WorkerPaymentHistory({ workerId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    loadPayments();
  }, [workerId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsData = await base44.entities.PaymentTransaction.filter(
        { worker_id: workerId },
        "-payment_date"
      );
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    completed: { 
      label: language === 'he' ? 'שולם' : 'Completed',
      color: "bg-green-100 text-green-800",
      icon: CheckCircle
    },
    pending: { 
      label: language === 'he' ? 'ממתין' : 'Pending',
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock
    },
    failed: { 
      label: language === 'he' ? 'נכשל' : 'Failed',
      color: "bg-red-100 text-red-800",
      icon: XCircle
    }
  };

  if (loading) {
    return <div className="text-center py-4">{t('loading')}</div>;
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          {language === 'he' ? 'אין היסטוריית תשלומים' : 'No payment history'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {language === 'he' ? 'היסטוריית תשלומים' : 'Payment History'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map(payment => {
            const status = statusConfig[payment.payment_status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(payment.payment_month + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </div>
                    {payment.payment_date && (
                      <div className="text-sm text-gray-500 mt-1">
                        {language === 'he' ? 'תאריך תשלום:' : 'Paid on:'} {new Date(payment.payment_date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                      </div>
                    )}
                  </div>
                  <Badge className={`${status.color} flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div>
                    <span className="text-gray-600">{language === 'he' ? 'ברוטו:' : 'Gross:'}</span>
                    <span className="font-semibold ml-2">{payment.gross_salary.toLocaleString()} {t('currency')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{language === 'he' ? 'נטו:' : 'Net:'}</span>
                    <span className="font-bold text-green-700 ml-2">{payment.net_salary.toLocaleString()} {t('currency')}</span>
                  </div>
                </div>

                {payment.transaction_reference && (
                  <div className="text-xs text-gray-500 mt-2">
                    {language === 'he' ? 'אסמכתא:' : 'Ref:'} {payment.transaction_reference}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}