import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader, TrendingUp, TrendingDown, AlertCircle, Save, Edit2, Target, BarChart3 } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [dashboardData, setDashboardData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("actual");

  // Goal Setting fields
  const [predictedSales, setPredictedSales] = useState(0);
  const [laborGoalPercent, setLaborGoalPercent] = useState(25);
  const [foodGoalPercent, setFoodGoalPercent] = useState(30);
  const [managementSalary, setManagementSalary] = useState(0);

  // Actual Performance fields
  const [actualSales, setActualSales] = useState(0);
  const [calculatedLaborCost, setCalculatedLaborCost] = useState(0);
  const [calculatedFoodCost, setCalculatedFoodCost] = useState(0);
  
  // Predicted values based on weekly schedules
  const [predictedLaborToDate, setPredictedLaborToDate] = useState(0);
  const [predictedSalesToDate, setPredictedSalesToDate] = useState(0);
  const [hasScheduleData, setHasScheduleData] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Add delay for retries
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
      
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Use acting_as_store_email if admin is controlling a user, otherwise use own email
      const workingEmail = currentUser.acting_as_store_email || currentUser.email;

      // Load all data in parallel for faster loading
      const monthStart = moment(selectedMonth).startOf('month');
      const today = moment();
      const monthEnd = moment(selectedMonth).endOf('month');
      const endDate = today.isBefore(monthEnd) && today.isAfter(monthStart) ? today : monthEnd;

      const [allDashboardData, allSchedules, allReceipts] = await Promise.all([
        base44.entities.MonthlyDashboardData.filter({ created_by: workingEmail, month: selectedMonth }),
        base44.entities.WeeklySchedule.filter({ created_by: workingEmail }),
        base44.entities.SupplyReceipt.filter({ created_by: workingEmail })
      ]);

      // Process dashboard data
      const existingData = allDashboardData[0];
      if (existingData) {
        setDashboardData(existingData);
        setPredictedSales(existingData.predicted_sales || existingData.total_sales || 0);
        setLaborGoalPercent(existingData.labor_goal_percent || 25);
        setFoodGoalPercent(existingData.food_goal_percent || 30);
        setManagementSalary(existingData.management_salary || 0);
        setActualSales(existingData.total_sales || 0);
      } else {
        setDashboardData(null);
        setPredictedSales(0);
        setLaborGoalPercent(25);
        setFoodGoalPercent(30);
        setManagementSalary(0);
        setActualSales(0);
      }

      // Calculate labor cost
      let totalLaborCost = 0;
      allSchedules.forEach(schedule => {
        const weekStart = moment(schedule.week_start_date);
        const weekEnd = moment(schedule.week_start_date).add(6, 'days');
        if (weekEnd.isSameOrAfter(monthStart) && weekStart.isSameOrBefore(endDate)) {
          (schedule.shifts || []).forEach(shift => {
            const shiftDate = moment(shift.date);
            if (shiftDate.isSameOrAfter(monthStart) && shiftDate.isSameOrBefore(endDate)) {
              totalLaborCost += shift.payment_for_shift || 0;
            }
          });
        }
      });
      setCalculatedLaborCost(totalLaborCost);

      // Calculate food cost (remove VAT from receipts since invoice_total includes VAT)
      const VAT_RATE = 1.17;
      let totalFoodCost = 0;
      allReceipts.forEach(receipt => {
        const receiptDate = moment(receipt.received_date);
        if (receiptDate.isSameOrAfter(monthStart) && receiptDate.isSameOrBefore(endDate)) {
          const receiptTotal = receipt.invoice_total || receipt.calculated_total || 0;
          // Remove VAT from receipt total
          totalFoodCost += receiptTotal / VAT_RATE;
        }
      });
      setCalculatedFoodCost(totalFoodCost);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      
      // Retry on network errors
      const isNetworkError = error.message?.includes('aborted') || 
                            error.message?.includes('Network') || 
                            error.code === 'ERR_NETWORK';
      
      if (isNetworkError && retryCount < 3) {
        console.log(`Retrying dashboard load... (${retryCount + 1}/3)`);
        return loadData(retryCount + 1);
      }
      
      setError(error.message);
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
        food_goal_percent: parseFloat(foodGoalPercent) || 30,
        management_salary: parseFloat(managementSalary) || 0,
        total_sales: parseFloat(actualSales) || 0,
        manual_labor_cost: calculatedLaborCost,
        manual_food_cost: calculatedFoodCost
      };

      if (dashboardData && dashboardData.id) {
        await base44.entities.MonthlyDashboardData.update(dashboardData.id, dataToSave);
      } else {
        await base44.entities.MonthlyDashboardData.create(dataToSave);
      }

      setEditMode(false);
      await loadData();
    } catch (error) {
      console.error("Error saving dashboard data:", error);
      alert(t('error_saving') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Validate combined goal doesn't exceed 60%
  const handleLaborGoalChange = (value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue + foodGoalPercent <= 60) {
      setLaborGoalPercent(newValue);
    } else {
      setLaborGoalPercent(60 - foodGoalPercent);
    }
  };

  const handleFoodGoalChange = (value) => {
    const newValue = parseFloat(value) || 0;
    if (newValue + laborGoalPercent <= 60) {
      setFoodGoalPercent(newValue);
    } else {
      setFoodGoalPercent(60 - laborGoalPercent);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              {language === 'he' ? 'שגיאה בטעינת דשבורד' : 'Error Loading Dashboard'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              {language === 'he' ? 'נסה שוב' : 'Try Again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  // Goal calculations
  const predictedSalesExVAT = predictedSales / 1.17;
  const combinedGoalPercent = laborGoalPercent + foodGoalPercent;
  const laborGoalAmount = predictedSalesExVAT * (laborGoalPercent / 100);
  const foodGoalAmount = predictedSalesExVAT * (foodGoalPercent / 100);

  // Actual calculations
  const actualSalesExVAT = actualSales / 1.17;
  const actualLaborPercent = actualSalesExVAT > 0 ? (calculatedLaborCost / actualSalesExVAT * 100) : 0;
  const actualFoodPercent = actualSalesExVAT > 0 ? (calculatedFoodCost / actualSalesExVAT * 100) : 0;
  const actualCombinedPercent = actualLaborPercent + actualFoodPercent;
  const isOverGoal = actualCombinedPercent > combinedGoalPercent;

  const costBreakdownData = [
    { name: language === 'he' ? 'עלות עבודה' : 'Labor Cost', value: calculatedLaborCost, color: '#1f2937' },
    { name: language === 'he' ? 'עלות מזון' : 'Food Cost', value: calculatedFoodCost, color: '#6b7280' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          <div>
            <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('monthly_dashboard')}
            </h1>
            <p className={`text-gray-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('dashboard_greeting', { name: user.full_name })}
            </p>
          </div>
          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            {!editMode ? (
              <Button onClick={() => setEditMode(true)} variant="outline" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Edit2 className="w-4 h-4" />
                {t('edit')}
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 bg-gray-900 hover:bg-gray-800 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('save')}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="actual" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {language === 'he' ? 'ביצוע בפועל' : 'Actual Performance'}
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              {language === 'he' ? 'הגדרת יעדים' : 'Goal Setting'}
            </TabsTrigger>
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              {language === 'he' ? 'יעד עבודה' : 'Labor Goals'}
            </TabsTrigger>
          </TabsList>

          {/* Actual Performance Tab */}
          <TabsContent value="actual" className="space-y-6">
            {/* Sales Input */}
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'מכירות בפועל' : 'Actual Sales'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                    {language === 'he' ? 'סה"כ מכירות (כולל מע"מ)' : 'Total Sales (incl. VAT)'}
                  </Label>
                  <Input
                    type="number"
                    value={actualSales}
                    onChange={(e) => setActualSales(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={`max-w-xs text-lg font-bold ${isRTL ? 'text-right' : 'text-left'}`}
                    disabled={!editMode}
                  />
                  <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'ללא מע"מ:' : 'Excl. VAT:'} {formatCurrency(actualSalesExVAT)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Calculated Costs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-gray-800 to-gray-900 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'עלות עבודה (מלו"ז)' : 'Labor Cost (from Schedules)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(calculatedLaborCost)}
                  </div>
                  <div className={`text-gray-300 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {actualLaborPercent.toFixed(1)}% {language === 'he' ? 'מהמכירות' : 'of sales'}
                  </div>
                  <div className={`text-gray-400 text-xs mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'מחושב מלו"ז משמרות עד היום' : 'Calculated from shift schedules to date'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'קבלות אספקה (ללא מע"מ)' : 'Supply Receipts (excl. VAT)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(calculatedFoodCost)}
                  </div>
                  <div className={`text-gray-200 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {actualFoodPercent.toFixed(1)}% {language === 'he' ? 'מהמכירות (ללא מע"מ)' : 'of sales (excl. VAT)'}
                  </div>
                  <div className={`text-gray-400 text-xs mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'סה"כ קבלות אספקה מתחילת החודש' : 'Total supply receipts from month start'}
                  </div>
                </CardContent>
              </Card>

              <Card className={`bg-gradient-to-br ${isOverGoal ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'אחוז עלויות משולב' : 'Combined Cost %'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {actualCombinedPercent.toFixed(1)}%
                  </div>
                  <div className={`text-sm flex items-center gap-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                    {isOverGoal ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isOverGoal 
                      ? (language === 'he' ? 'מעל היעד ב-' : 'Over goal by ')
                      : (language === 'he' ? 'מתחת ליעד ב-' : 'Under goal by ')
                    }
                    {Math.abs(actualCombinedPercent - combinedGoalPercent).toFixed(1)}%
                  </div>
                  <div className={`text-white/80 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'יעד:' : 'Goal:'} {combinedGoalPercent.toFixed(0)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'פילוח עלויות' : 'Cost Breakdown'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(calculatedLaborCost > 0 || calculatedFoodCost > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={costBreakdownData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.value > 0 ? formatCurrency(entry.value) : ''}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {costBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className={`space-y-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex justify-between items-center p-3 bg-gray-100 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-gray-600">{language === 'he' ? 'עלות עבודה' : 'Labor Cost'}:</span>
                        <div className={isRTL ? 'text-left' : 'text-right'}>
                          <span className="font-bold text-gray-900">{formatCurrency(calculatedLaborCost)}</span>
                          <span className="text-sm text-gray-500 mr-2 rtl:ml-2 rtl:mr-0">({actualLaborPercent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className={`flex justify-between items-center p-3 bg-gray-100 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-gray-600">{language === 'he' ? 'עלות מזון' : 'Food Cost'}:</span>
                        <div className={isRTL ? 'text-left' : 'text-right'}>
                          <span className="font-bold text-gray-700">{formatCurrency(calculatedFoodCost)}</span>
                          <span className="text-sm text-gray-500 mr-2 rtl:ml-2 rtl:mr-0">({actualFoodPercent.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className={`flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold">{language === 'he' ? 'סה"כ עלויות' : 'Total Costs'}:</span>
                        <span className="font-bold text-lg text-blue-700">{formatCurrency(calculatedLaborCost + calculatedFoodCost)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-gray-400">
                    <p>{language === 'he' ? 'אין נתונים להצגה' : 'No data to display'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goal Setting Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'הגדרת יעדים חודשיים' : 'Monthly Goal Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Predicted Sales */}
                <div className="space-y-2">
                  <Label className={`text-lg font-semibold ${isRTL ? 'text-right block' : 'text-left block'}`}>
                    {language === 'he' ? 'מכירות צפויות (כולל מע"מ)' : 'Predicted Sales (incl. VAT)'}
                  </Label>
                  <Input
                    type="number"
                    value={predictedSales}
                    onChange={(e) => setPredictedSales(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={`max-w-xs text-lg font-bold ${isRTL ? 'text-right' : 'text-left'}`}
                    disabled={!editMode}
                  />
                  <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'ללא מע"מ:' : 'Excl. VAT:'} {formatCurrency(predictedSalesExVAT)}
                  </p>
                </div>

                {/* Goal Percentages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={`font-semibold ${isRTL ? 'text-right block' : 'text-left block'}`}>
                      {language === 'he' ? 'יעד אחוז עלות עבודה' : 'Labor Cost Goal %'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        step="0.5"
                        value={laborGoalPercent}
                        onChange={(e) => handleLaborGoalChange(e.target.value)}
                        className={`w-24 text-center ${isRTL ? 'text-right' : 'text-left'}`}
                        disabled={!editMode}
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    <p className={`text-sm text-green-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      = {formatCurrency(laborGoalAmount)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className={`font-semibold ${isRTL ? 'text-right block' : 'text-left block'}`}>
                      {language === 'he' ? 'יעד אחוז עלות מזון' : 'Food Cost Goal %'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        step="0.5"
                        value={foodGoalPercent}
                        onChange={(e) => handleFoodGoalChange(e.target.value)}
                        className={`w-24 text-center ${isRTL ? 'text-right' : 'text-left'}`}
                        disabled={!editMode}
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    <p className={`text-sm text-green-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      = {formatCurrency(foodGoalAmount)}
                    </p>
                  </div>
                </div>

                {/* Combined Goal Display */}
                <div className={`p-4 rounded-lg ${combinedGoalPercent > 60 ? 'bg-red-100 border-2 border-red-300' : 'bg-green-100 border-2 border-green-300'}`}>
                  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-lg">
                      {language === 'he' ? 'יעד משולב:' : 'Combined Goal:'}
                    </span>
                    <span className={`text-2xl font-bold ${combinedGoalPercent > 60 ? 'text-red-600' : 'text-green-600'}`}>
                      {combinedGoalPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${combinedGoalPercent > 60 ? 'text-red-600' : 'text-green-600'} ${isRTL ? 'text-right' : 'text-left'}`}>
                    {combinedGoalPercent > 60 
                      ? (language === 'he' ? '⚠️ היעד המשולב לא יכול לעלות על 60%' : '⚠️ Combined goal cannot exceed 60%')
                      : (language === 'he' ? '✓ היעד בטווח המומלץ' : '✓ Goal is within recommended range')
                    }
                  </p>
                  <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'סה"כ יעד עלויות:' : 'Total Cost Goal:'} {formatCurrency(laborGoalAmount + foodGoalAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Goal Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'יעד מכירות' : 'Sales Goal'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(predictedSales)}
                  </div>
                  <div className={`text-blue-100 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'כולל מע"מ' : 'Including VAT'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-700 to-gray-800 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'יעד עלות עבודה' : 'Labor Cost Goal'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(laborGoalAmount)}
                  </div>
                  <div className={`text-gray-300 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {laborGoalPercent}% {language === 'he' ? 'מהמכירות' : 'of sales'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                <CardHeader>
                  <CardTitle className={`text-white text-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'he' ? 'יעד עלות מזון' : 'Food Cost Goal'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatCurrency(foodGoalAmount)}
                  </div>
                  <div className={`text-gray-200 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                    {foodGoalPercent}% {language === 'he' ? 'מהמכירות' : 'of sales'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Labor Goals Tab */}
          <TabsContent value="labor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                  {language === 'he' ? 'יעד עלות עבודה - פירוט' : 'Labor Cost Goal - Breakdown'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Management/Owner Salary */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="space-y-2">
                    <Label className={`text-lg font-semibold text-purple-800 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                      {language === 'he' ? 'משכורת הנהלה/בעלים (חודשי)' : 'Management/Owner Salary (Monthly)'}
                    </Label>
                    <Input
                      type="number"
                      value={managementSalary}
                      onChange={(e) => setManagementSalary(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className={`max-w-xs text-lg font-bold ${isRTL ? 'text-right' : 'text-left'}`}
                      disabled={!editMode}
                    />
                    <p className={`text-sm text-purple-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {language === 'he' ? 'עלות קבועה שאינה תלויה במשמרות' : 'Fixed cost not dependent on shifts'}
                    </p>
                  </div>
                </div>

                {/* Labor Goal Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                      {language === 'he' ? 'יעד הכנסות (ללא מע"מ)' : 'Income Goal (excl. VAT)'}
                    </Label>
                    <div className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {formatCurrency(predictedSalesExVAT)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-4">
                    <Label className={`text-sm text-gray-600 ${isRTL ? 'text-right block' : 'text-left block'}`}>
                      {language === 'he' ? 'יעד עלות עבודה כולל' : 'Total Labor Cost Goal'}
                    </Label>
                    <div className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {formatCurrency(laborGoalAmount)}
                    </div>
                    <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {laborGoalPercent}% {language === 'he' ? 'מהמכירות' : 'of sales'}
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
                        {predictedSalesExVAT > 0 ? `${((managementSalary / predictedSalesExVAT) * 100).toFixed(1)}%` : '0%'} {language === 'he' ? 'מהמכירות' : 'of sales'}
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
                        {formatCurrency(Math.max(0, laborGoalAmount - managementSalary))}
                      </div>
                      <div className={`text-blue-200 text-xs mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'he' ? 'יעד עבודה כולל פחות הנהלה' : 'Total labor goal minus management'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br ${laborGoalAmount - managementSalary < 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white`}>
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {language === 'he' ? 'אחוז יעד לעובדי משמרות' : 'Shift Workers Goal %'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${isRTL ? 'text-right' : 'text-left'}`}>
                        {predictedSalesExVAT > 0 ? (((laborGoalAmount - managementSalary) / predictedSalesExVAT) * 100).toFixed(1) : '0'}%
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
                      <span className="font-bold text-blue-800">{formatCurrency(Math.max(0, laborGoalAmount - managementSalary))}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}