import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Users, ChefHat, AlertCircle, Target } from "lucide-react"; // Added Target icon
import { useLanguage } from "../LanguageProvider";

export default function MonthlyDashboard({ user }) {
  const { t } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [laborCost, setLaborCost] = useState(0);
  const [foodCost, setFoodCost] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [laborPercentage, setLaborPercentage] = useState(0);
  const [foodPercentage, setFoodPercentage] = useState(0);
  const [combinedPercentage, setCombinedPercentage] = useState(0);

  const GOAL_PERCENTAGE = 60; // Used GOAL_PERCENTAGE as in original code, outline used targetPercentage

  function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function getMonthDateRange(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const endDate = isCurrentMonth ? today : new Date(year, month, 0);
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth, user]);

  const loadMonthlyData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { start, end } = getMonthDateRange(selectedMonth);

      // Load weekly schedules for labor costs
      const weeklySchedules = await base44.entities.WeeklySchedule.filter({
        created_by: user.email
      });

      const schedulesInMonth = weeklySchedules.filter(schedule => {
        const weekDate = schedule.week_start_date;
        return weekDate >= start && weekDate <= end;
      });

      // Total labor cost already includes employer costs from the schedule
      // The 'total_cost' field in WeeklySchedule is expected to encompass all labor-related costs, including employer contributions.
      const totalLabor = schedulesInMonth.reduce((sum, schedule) => sum + (schedule.total_cost || 0), 0);
      const totalWeeklySales = schedulesInMonth.reduce((sum, schedule) => sum + (schedule.predicted_weekly_sales || 0), 0);

      // Load AFC reports for food costs
      const afcReports = await base44.entities.AFCReport.filter({
        created_by: user.email
      });

      const afcInMonth = afcReports.filter(report => {
        const reportDate = report.report_date;
        return reportDate >= start && reportDate <= end;
      });

      const totalFood = afcInMonth.reduce((sum, report) => sum + (report.actual_food_cost || 0), 0);
      const totalAfcSales = afcInMonth.reduce((sum, report) => sum + (report.total_sales || 0), 0);

      // Calculate totals
      const combinedSales = Math.max(totalWeeklySales, totalAfcSales);
      const salesExcludingVAT = combinedSales / 1.17;

      setLaborCost(totalLabor);
      setFoodCost(totalFood);
      setTotalSales(combinedSales);

      if (salesExcludingVAT > 0) {
        const laborPct = (totalLabor / salesExcludingVAT) * 100;
        const foodPct = (totalFood / salesExcludingVAT) * 100;
        const combinedPct = laborPct + foodPct;

        setLaborPercentage(laborPct);
        setFoodPercentage(foodPct);
        setCombinedPercentage(combinedPct);
      } else {
        setLaborPercentage(0);
        setFoodPercentage(0);
        setCombinedPercentage(0);
      }

    } catch (error) {
      console.error("Error loading monthly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(t('language') === 'he' ? 'he-IL' : 'en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      options.push({ value, label });
    }
    return options;
  };

  // Helper function for currency formatting
  const formatCurrency = (amount) => {
    const locale = t('language') === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const isOverGoal = combinedPercentage > GOAL_PERCENTAGE;
  // progressColor was in original code, but is not used in the new card design for the top row.
  // Kept here for potential future use or if other parts of the dashboard still rely on it.
  const progressColor = combinedPercentage <= GOAL_PERCENTAGE * 0.9 ? 'bg-green-500' : 
                        combinedPercentage <= GOAL_PERCENTAGE ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6 text-right">
      <div className="flex justify-between items-center flex-row-reverse">
        <h2 className="text-2xl font-bold">{t('monthly_dashboard')}</h2>
        <div className="w-64">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map(option => (
                <SelectItem key={option.value} value={option.value} className="text-right">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('loading')}</div>
      ) : (
        <>
          {/* Key Metrics - Replaced the original grid of three cards with the new structure from the outline */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-row-reverse">
                  <Users className="w-12 h-12 text-purple-400" />
                  <div className="text-right">
                    <p className="text-sm font-medium text-purple-600">{t('labor_cost')}</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">
                      {formatCurrency(laborCost)}
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      {laborPercentage.toFixed(1)}% {t('of_sales')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-row-reverse">
                  <ChefHat className="w-12 h-12 text-orange-400" />
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">{t('food_cost')}</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">
                      {formatCurrency(foodCost)}
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      {foodPercentage.toFixed(1)}% {t('of_sales')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-row-reverse">
                  <Target className={`w-12 h-12 ${combinedPercentage > GOAL_PERCENTAGE ? 'text-red-400' : 'text-green-400'}`} />
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">{t('combined_cost_percentage')}</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {combinedPercentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {t('goal')}: {GOAL_PERCENTAGE}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={`border-2 ${isOverGoal ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-row-reverse">
                <span className={`text-3xl font-bold ${isOverGoal ? 'text-red-700' : 'text-green-700'}`}>
                  {combinedPercentage.toFixed(1)}%
                </span>
                <span className="flex items-center gap-2 flex-row-reverse">
                  {isOverGoal ? (
                    <><span>{t('over_goal')}</span><AlertCircle className="w-6 h-6 text-red-600" /></>
                  ) : (
                    <><span>{t('on_track')}</span><TrendingDown className="w-6 h-6 text-green-600" /></>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2 flex-row-reverse">
                  <Label className="text-sm text-gray-600">
                    {t('goal')}: {GOAL_PERCENTAGE}%
                  </Label>
                  <Label className="text-sm font-semibold">{t('combined_cost_percentage')}</Label>
                </div>
                <Progress 
                  value={Math.min((combinedPercentage / GOAL_PERCENTAGE) * 100, 100)} 
                  className="h-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">{t('labor_percentage')}</div>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-sm font-semibold text-purple-700">
                      {laborPercentage.toFixed(1)}%
                    </span>
                    <div className="flex-1 bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((laborPercentage / GOAL_PERCENTAGE) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">{t('food_percentage')}</div>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="text-sm font-semibold text-orange-700">
                      {foodPercentage.toFixed(1)}%
                    </span>
                    <div className="flex-1 bg-orange-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((foodPercentage / GOAL_PERCENTAGE) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t text-right">
                <div className="text-sm text-gray-600">
                  {isOverGoal ? (
                    <p className="text-red-700 font-semibold">
                      ⚠️ {t('over_goal_by')} {(combinedPercentage - GOAL_PERCENTAGE).toFixed(1)}%
                    </p>
                  ) : (
                    <p className="text-green-700 font-semibold">
                      ✓ {t('under_goal_by')} {(GOAL_PERCENTAGE - combinedPercentage).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-right">{t('cost_breakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="font-semibold">{formatCurrency(laborCost)}</span>
                    <span className="text-sm text-gray-600">{t('labor_cost')}</span>
                  </div>
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="font-semibold">{formatCurrency(foodCost)}</span>
                    <span className="text-sm text-gray-600">{t('food_cost')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t flex-row-reverse">
                    <span className="font-bold text-lg">{formatCurrency(laborCost + foodCost)}</span>
                    <span className="text-sm font-semibold">{t('total_costs')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-right">{t('profit_analysis')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="font-semibold">{formatCurrency(totalSales / 1.17)}</span>
                    <span className="text-sm text-gray-600">{t('total_sales')} ({t('excluding_vat')})</span>
                  </div>
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="font-semibold">{formatCurrency(laborCost + foodCost)}</span>
                    <span className="text-sm text-gray-600">{t('total_costs')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t flex-row-reverse">
                    <span className={`font-bold text-lg ${(totalSales / 1.17 - laborCost - foodCost) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency((totalSales / 1.17) - laborCost - foodCost)}
                    </span>
                    <span className="text-sm font-semibold">{t('estimated_profit')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}