import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader, Save, AlertCircle, Target } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";

export default function LaborGoalsTab() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  
  // Goal fields
  const [predictedSales, setPredictedSales] = useState(0);
  const [laborGoalPercent, setLaborGoalPercent] = useState(25);
  const [managementSalary, setManagementSalary] = useState(0);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const workingEmail = user.acting_as_store_email || user.email;
      
      const data = await base44.entities.MonthlyDashboardData.filter({ 
        created_by: workingEmail, 
        month: selectedMonth 
      });
      
      if (data.length > 0) {
        const existingData = data[0];
        setDashboardData(existingData);
        setPredictedSales(existingData.predicted_sales || 0);
        setLaborGoalPercent(existingData.labor_goal_percent || 25);
        setManagementSalary(existingData.management_salary || 0);
      } else {
        setDashboardData(null);
        setPredictedSales(0);
        setLaborGoalPercent(25);
        setManagementSalary(0);
      }
    } catch (error) {
      console.error("Error loading labor goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const dataToSave = {
        month: selectedMonth,
        predicted_sales: parseFloat(predictedSales) || 0,
        labor_goal_percent: parseFloat(laborGoalPercent) || 25,
        management_salary: parseFloat(managementSalary) || 0
      };

      if (dashboardData && dashboardData.id) {
        await base44.entities.MonthlyDashboardData.update(dashboardData.id, dataToSave);
        // Update local state immediately instead of reloading
        setDashboardData({ ...dashboardData, ...dataToSave });
      } else {
        const newData = await base44.entities.MonthlyDashboardData.create(dataToSave);
        setDashboardData(newData);
      }

      alert(language === 'he' ? 'נשמר בהצלחה!' : 'Saved successfully!');
    } catch (error) {
      console.error("Error saving labor goals:", error);
      alert(language === 'he' ? 'שגיאה בשמירה' : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Calculations
  const predictedSalesExVAT = predictedSales / 1.17;
  const laborGoalAmount = predictedSalesExVAT * (laborGoalPercent / 100);
  const shiftWorkersGoal = Math.max(0, laborGoalAmount - managementSalary);
  const shiftWorkersGoalPercent = predictedSalesExVAT > 0 ? (shiftWorkersGoal / predictedSalesExVAT) * 100 : 0;
  const managementPercent = predictedSalesExVAT > 0 ? (managementSalary / predictedSalesExVAT) * 100 : 0;

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <CardTitle className={`text-2xl font-bold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Target className="w-6 h-6 text-purple-600" />
              {language === 'he' ? 'יעד עלות עבודה' : 'Labor Cost Goals'}
            </CardTitle>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = moment().subtract(i, 'months');
                  return (
                    <option key={date.format('YYYY-MM')} value={date.format('YYYY-MM')}>
                      {date.format('YYYY-MM')}
                    </option>
                  );
                })}
              </select>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className={isRTL ? 'mr-2' : 'ml-2'}>{t('save')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className={`text-sm font-semibold ${isRTL ? 'text-right block' : 'text-left block'}`}>
                {language === 'he' ? 'מכירות צפויות (כולל מע"מ)' : 'Predicted Sales (incl. VAT)'}
              </Label>
              <Input
                type="number"
                value={predictedSales}
                onChange={(e) => setPredictedSales(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="text-lg font-bold"
              />
              <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'ללא מע"מ:' : 'Excl. VAT:'} {formatCurrency(predictedSalesExVAT)}
              </p>
            </div>

            <div className="space-y-2">
              <Label className={`text-sm font-semibold ${isRTL ? 'text-right block' : 'text-left block'}`}>
                {language === 'he' ? 'יעד אחוז עלות עבודה' : 'Labor Cost Goal %'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={laborGoalPercent}
                  onChange={(e) => setLaborGoalPercent(parseFloat(e.target.value) || 0)}
                  className="w-24 text-center text-lg font-bold"
                />
                <span className="text-gray-600 text-lg">%</span>
              </div>
              <p className={`text-sm text-green-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                = {formatCurrency(laborGoalAmount)}
              </p>
            </div>

            <div className="space-y-2 bg-purple-50 p-4 rounded-lg border border-purple-200">
              <Label className={`text-sm font-semibold text-purple-800 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                {language === 'he' ? 'משכורת הנהלה/בעלים (חודשי)' : 'Management/Owner Salary (Monthly)'}
              </Label>
              <Input
                type="number"
                value={managementSalary}
                onChange={(e) => setManagementSalary(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="text-lg font-bold"
              />
              <p className={`text-xs text-purple-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' ? 'עלות קבועה שאינה תלויה במשמרות' : 'Fixed cost not dependent on shifts'}
              </p>
            </div>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className={`text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'משכורת הנהלה/בעלים' : 'Management/Owner Salary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                  {formatCurrency(managementSalary)}
                </div>
                <div className={`text-purple-200 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {managementPercent.toFixed(1)}% {language === 'he' ? 'מהמכירות' : 'of sales'}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardTitle className={`text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'יעד עלות עובדי משמרות' : 'Shift Workers Labor Goal'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                  {formatCurrency(shiftWorkersGoal)}
                </div>
                <div className={`text-blue-200 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'יעד עבודה כולל פחות הנהלה' : 'Total labor goal minus management'}
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${shiftWorkersGoal < 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'אחוז יעד לעובדי משמרות' : 'Shift Workers Goal %'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                  {shiftWorkersGoalPercent.toFixed(1)}%
                </div>
                <div className={`text-white/80 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'מתוך המכירות (ללא מע"מ)' : 'of sales (excl. VAT)'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning if management salary exceeds labor goal */}
          {managementSalary > laborGoalAmount && (
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
              <div className={`flex items-center gap-2 text-red-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">
                  {language === 'he' 
                    ? '⚠️ משכורת ההנהלה גבוהה מיעד עלות העבודה הכולל!' 
                    : '⚠️ Management salary exceeds total labor cost goal!'}
                </span>
              </div>
              <p className={`text-sm text-red-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {language === 'he' 
                  ? 'יש להגדיל את יעד אחוז עלות העבודה או להקטין את משכורת ההנהלה'
                  : 'Consider increasing labor cost goal % or reducing management salary'}
              </p>
            </div>
          )}

          {/* Summary Table */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className={`font-semibold mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {language === 'he' ? 'סיכום יעדי עלות עבודה' : 'Labor Cost Goals Summary'}
            </h4>
            <div className="space-y-2">
              <div className={`flex justify-between items-center py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">{language === 'he' ? 'יעד הכנסות (ללא מע"מ):' : 'Income Goal (excl. VAT):'}</span>
                <span className="font-bold">{formatCurrency(predictedSalesExVAT)}</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-600">{language === 'he' ? 'יעד עלות עבודה כולל:' : 'Total Labor Goal:'}</span>
                <span className="font-bold">{formatCurrency(laborGoalAmount)} ({laborGoalPercent}%)</span>
              </div>
              <div className={`flex justify-between items-center py-2 border-b text-purple-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span>{language === 'he' ? 'פחות: משכורת הנהלה/בעלים:' : 'Less: Management/Owner Salary:'}</span>
                <span className="font-bold">- {formatCurrency(managementSalary)}</span>
              </div>
              <div className={`flex justify-between items-center py-2 bg-blue-100 rounded px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="font-semibold text-blue-800">{language === 'he' ? 'יעד עובדי משמרות:' : 'Shift Workers Goal:'}</span>
                <span className="font-bold text-blue-800">{formatCurrency(shiftWorkersGoal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}