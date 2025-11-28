import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Building2, User, Calendar } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function WorkerPayslip({ worker, month, onClose }) {
  const { t, language } = useLanguage();

  // Israeli tax calculation (simplified)
  const calculateNetSalary = () => {
    const grossMonthly = worker.payment_type === 'monthly' 
      ? worker.payment_amount
      : worker.payment_type === 'daily'
      ? worker.payment_amount * 22
      : worker.payment_amount * 176;

    const grossAnnual = grossMonthly * 12;

    // Tax credit value per point (2024: ~223 NIS/month per point)
    const taxCreditMonthly = (worker.tax_credit_points || 2.25) * 223;

    // Income tax brackets (2024, simplified)
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

    // Apply tax credit
    incomeTax = Math.max(0, incomeTax - taxCreditMonthly);

    // National Insurance (Bituach Leumi) - up to max ceiling
    const nationalInsurance = Math.min(grossMonthly * 0.07, 2500);

    // Health Insurance
    const healthInsurance = grossMonthly * 0.05;

    const totalDeductions = incomeTax + nationalInsurance + healthInsurance;
    const netSalary = grossMonthly - totalDeductions;

    return {
      grossMonthly,
      incomeTax,
      nationalInsurance,
      healthInsurance,
      totalDeductions,
      netSalary,
      taxCreditMonthly
    };
  };

  const salary = calculateNetSalary();
  const monthName = new Date(month + '-01').toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { 
    year: 'numeric', 
    month: 'long' 
  });

  const downloadPDF = () => {
    const printContent = document.getElementById('payslip-content');
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write('<html><head><title>תלוש שכר</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: Arial, sans-serif; padding: 20px; direction: ${language === 'he' ? 'rtl' : 'ltr'}; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
      .header h1 { margin: 0; color: #2563eb; }
      .section { margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #ddd; }
      .row.total { background-color: #f0f9ff; font-weight: bold; font-size: 1.1em; }
      .label { font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { padding: 10px; text-align: ${language === 'he' ? 'right' : 'left'}; border-bottom: 1px solid #ddd; }
      th { background-color: #f3f4f6; }
      .total-row { background-color: #e0f2fe; font-weight: bold; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl">
            {language === 'he' ? 'תלוש שכר' : 'Payslip'}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              {language === 'he' ? 'הורד PDF' : 'Download PDF'}
            </Button>
            <Button onClick={onClose} variant="outline">
              {t('cancel')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div id="payslip-content">
          {/* Header */}
          <div className="header text-center mb-8 border-b-2 pb-6">
            <h1 className="text-3xl font-bold text-blue-700 mb-2">
              {language === 'he' ? 'תלוש שכר' : 'PAYSLIP'}
            </h1>
            <p className="text-xl text-gray-700">{monthName}</p>
          </div>

          {/* Employee Details */}
          <div className="section mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              {language === 'he' ? 'פרטי עובד' : 'Employee Details'}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="row">
                <span className="label">{language === 'he' ? 'שם:' : 'Name:'}</span>
                <span>{worker.full_name}</span>
              </div>
              {worker.id_number && (
                <div className="row">
                  <span className="label">{language === 'he' ? 'ת.ז:' : 'ID:'}</span>
                  <span>{worker.id_number}</span>
                </div>
              )}
              <div className="row">
                <span className="label">{language === 'he' ? 'תפקיד:' : 'Position:'}</span>
                <span>{worker.job_position_name}</span>
              </div>
              <div className="row">
                <span className="label">{language === 'he' ? 'מחלקה:' : 'Department:'}</span>
                <span>{t(worker.section)}</span>
              </div>
            </div>
          </div>

          {/* Salary Details */}
          <div className="section mb-8">
            <h2 className="text-lg font-bold mb-4">
              {language === 'he' ? 'פירוט שכר' : 'Salary Details'}
            </h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th>{language === 'he' ? 'תיאור' : 'Description'}</th>
                  <th>{language === 'he' ? 'סכום' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{language === 'he' ? 'שכר ברוטו' : 'Gross Salary'}</td>
                  <td className="font-semibold">{salary.grossMonthly.toLocaleString()} {t('currency')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div className="section mb-8">
            <h2 className="text-lg font-bold mb-4 text-red-700">
              {language === 'he' ? 'ניכויים' : 'Deductions'}
            </h2>
            <table className="w-full">
              <tbody>
                <tr>
                  <td>{language === 'he' ? 'מס הכנסה' : 'Income Tax'}</td>
                  <td className="text-red-600">-{salary.incomeTax.toLocaleString()} {t('currency')}</td>
                </tr>
                <tr>
                  <td>{language === 'he' ? 'ביטוח לאומי' : 'National Insurance'}</td>
                  <td className="text-red-600">-{salary.nationalInsurance.toLocaleString()} {t('currency')}</td>
                </tr>
                <tr>
                  <td>{language === 'he' ? 'ביטוח בריאות' : 'Health Insurance'}</td>
                  <td className="text-red-600">-{salary.healthInsurance.toLocaleString()} {t('currency')}</td>
                </tr>
                <tr className="total-row">
                  <td className="font-bold">{language === 'he' ? 'סה"כ ניכויים' : 'Total Deductions'}</td>
                  <td className="font-bold text-red-600">-{salary.totalDeductions.toLocaleString()} {t('currency')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Salary */}
          <div className="section">
            <div className="row total bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
              <span className="text-xl">{language === 'he' ? 'שכר נטו לתשלום:' : 'Net Salary to Pay:'}</span>
              <span className="text-2xl text-green-700">{salary.netSalary.toLocaleString()} {t('currency')}</span>
            </div>
          </div>

          {/* Bank Details */}
          {(worker.bank_name || worker.bank_account) && (
            <div className="section mt-8 pt-6 border-t">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {language === 'he' ? 'פרטי בנק' : 'Bank Details'}
              </h3>
              <div className="text-sm text-gray-600">
                {worker.bank_name && <div>{language === 'he' ? 'בנק:' : 'Bank:'} {worker.bank_name}</div>}
                {worker.bank_branch && <div>{language === 'he' ? 'סניף:' : 'Branch:'} {worker.bank_branch}</div>}
                {worker.bank_account && <div>{language === 'he' ? 'חשבון:' : 'Account:'} {worker.bank_account}</div>}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="section mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>{language === 'he' ? 'תלוש זה הופק אוטומטית' : 'This payslip was generated automatically'}</p>
            <p className="flex items-center justify-center gap-2 mt-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}