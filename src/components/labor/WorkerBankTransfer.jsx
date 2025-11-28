import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, CreditCard, Send, AlertCircle } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function WorkerBankTransfer({ worker, month, netSalary, onComplete, onClose }) {
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const { t, language } = useLanguage();

  // Calculate salary details
  const calculateSalaryDetails = () => {
    const grossMonthly = worker.payment_type === 'monthly' 
      ? worker.payment_amount
      : worker.payment_type === 'daily'
      ? worker.payment_amount * 22
      : worker.payment_amount * 176;

    const grossAnnual = grossMonthly * 12;
    const taxCreditMonthly = (worker.tax_credit_points || 2.25) * 223;

    let incomeTax = 0;
    if (grossAnnual <= 77_400) {
      incomeTax = grossMonthly * 0.10;
    } else if (grossAnnual <= 110_880) {
      incomeTax = grossMonthly * 0.14;
    } else if (grossAnnual <= 178_080) {
      incomeTax = grossMonthly * 0.20;
    } else if (grossAnnual <= 247_440) {
      incomeTax = grossMonthly * 0.31;
    } else if (grossAnnual <= 514_920) {
      incomeTax = grossMonthly * 0.35;
    } else if (grossAnnual <= 663_240) {
      incomeTax = grossMonthly * 0.47;
    } else {
      incomeTax = grossMonthly * 0.50;
    }

    incomeTax = Math.max(0, incomeTax - taxCreditMonthly);
    const nationalInsurance = Math.min(grossMonthly * 0.07, 2500);
    const healthInsurance = grossMonthly * 0.05;

    return {
      grossMonthly,
      incomeTax,
      nationalInsurance,
      healthInsurance,
      netSalary: grossMonthly - incomeTax - nationalInsurance - healthInsurance
    };
  };

  const salary = calculateSalaryDetails();

  const initiateBankTransfer = () => {
    // Open bank website with pre-filled details
    // This is a generic approach - each bank has different URL structures
    const amount = salary.netSalary.toFixed(2);
    const beneficiary = encodeURIComponent(worker.full_name);
    const reference = encodeURIComponent(`Salary ${month}`);
    
    // Generic bank transfer URL (users will need to log in to their bank)
    // For Israeli banks like Discount, Leumi, Hapoalim, etc.
    alert(
      language === 'he' 
        ? `יש להיכנס לחשבון הבנק שלך ולהעביר:\n\nסכום: ${amount} ₪\nלטובת: ${worker.full_name}\nבנק: ${worker.bank_name || 'N/A'}\nסניף: ${worker.bank_branch || 'N/A'}\nחשבון: ${worker.bank_account || 'N/A'}\nהערה: משכורת ${month}`
        : `Please log in to your bank account and transfer:\n\nAmount: ${amount} ₪\nTo: ${worker.full_name}\nBank: ${worker.bank_name || 'N/A'}\nBranch: ${worker.bank_branch || 'N/A'}\nAccount: ${worker.bank_account || 'N/A'}\nReference: Salary ${month}`
    );
    
    // Common Israeli bank URLs
    const bankUrls = {
      'discount': 'https://start.telebank.co.il',
      'leumi': 'https://hb2.bankleumi.co.il',
      'hapoalim': 'https://login.bankhapoalim.co.il',
      'mizrahi': 'https://www.mizrahi-tefahot.co.il',
    };

    // Try to open the relevant bank website
    window.open('https://www.bankleumi.co.il', '_blank');
  };

  const handleSavePayment = async () => {
    try {
      setSaving(true);

      const paymentData = {
        worker_id: worker.id,
        worker_name: worker.full_name,
        payment_month: month,
        gross_salary: salary.grossMonthly,
        income_tax: salary.incomeTax,
        national_insurance: salary.nationalInsurance,
        health_insurance: salary.healthInsurance,
        other_deductions: 0,
        net_salary: salary.netSalary,
        payment_date: paymentDate,
        payment_status: transactionRef ? "completed" : "pending",
        transaction_reference: transactionRef,
        notes: ""
      };

      await base44.entities.PaymentTransaction.create(paymentData);

      alert(language === 'he' ? 'התשלום נשמר בהצלחה!' : 'Payment saved successfully!');
      onComplete();
    } catch (error) {
      console.error("Error saving payment:", error);
      alert(language === 'he' ? 'שגיאה בשמירת התשלום' : 'Error saving payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Send className="w-6 h-6" />
            {language === 'he' ? 'העברה בנקאית' : 'Bank Transfer'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Worker Details */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{language === 'he' ? 'עובד' : 'Worker'}</p>
                  <p className="font-bold text-lg">{worker.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{language === 'he' ? 'חודש' : 'Month'}</p>
                  <p className="font-bold text-lg">
                    {new Date(month + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          {(worker.bank_name || worker.bank_account) ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {language === 'he' ? 'פרטי בנק' : 'Bank Details'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {worker.bank_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{language === 'he' ? 'בנק:' : 'Bank:'}</span>
                    <span className="font-semibold">{worker.bank_name}</span>
                  </div>
                )}
                {worker.bank_branch && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{language === 'he' ? 'סניף:' : 'Branch:'}</span>
                    <span className="font-semibold">{worker.bank_branch}</span>
                  </div>
                )}
                {worker.bank_account && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{language === 'he' ? 'חשבון:' : 'Account:'}</span>
                    <span className="font-semibold">{worker.bank_account}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  {language === 'he' 
                    ? 'חסרים פרטי בנק לעובד. אנא הוסף פרטי בנק בכרטיס העובד.'
                    : 'Bank details missing. Please add bank details to worker card.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Payment Amount */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 mb-2">{language === 'he' ? 'סכום לתשלום (נטו)' : 'Amount to Transfer (Net)'}</p>
                <p className="text-4xl font-bold text-green-700">
                  {salary.netSalary.toLocaleString()} {t('currency')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'he' ? 'תאריך תשלום' : 'Payment Date'}</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === 'he' ? 'מספר אסמכתא (לאחר ביצוע ההעברה)' : 'Transaction Reference (after transfer)'}</Label>
              <Input
                placeholder={language === 'he' ? 'הזן מספר אסמכתא...' : 'Enter reference number...'}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={initiateBankTransfer}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {language === 'he' ? 'פתח בנק' : 'Open Bank'}
          </Button>
          <Button 
            onClick={handleSavePayment}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? t('saving') : (language === 'he' ? 'שמור תשלום' : 'Save Payment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}