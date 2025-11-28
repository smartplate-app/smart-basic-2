import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, TrendingUp, Users, DollarSign, Calendar, Copy } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { toast } from "sonner";
import moment from "moment";

export default function SalesPredictionPage() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [dailyData, setDailyData] = useState({
    average_per_guest: 0,
    total_guests: 0,
    daily_total: 0
  });

  const [weeklyData, setWeeklyData] = useState({
    operating_days_per_week: 7,
    weekly_total: 0
  });

  const [monthlyData, setMonthlyData] = useState({
    operating_days_per_month: 30,
    monthly_total: 0
  });

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return moment().startOf('isoWeek').format('YYYY-MM-DD');
  });

  useEffect(() => {
    calculateTotals();
  }, [dailyData.average_per_guest, dailyData.total_guests, weeklyData.operating_days_per_week, monthlyData.operating_days_per_month]);

  const calculateTotals = () => {
    // Calculate daily total
    const daily = dailyData.average_per_guest * dailyData.total_guests;
    
    // Calculate weekly total
    const weekly = daily * weeklyData.operating_days_per_week;
    
    // Calculate monthly total
    const monthly = daily * monthlyData.operating_days_per_month;

    setDailyData(prev => ({ ...prev, daily_total: daily }));
    setWeeklyData(prev => ({ ...prev, weekly_total: weekly }));
    setMonthlyData(prev => ({ ...prev, monthly_total: monthly }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleCopyToSchedule = async () => {
    if (!weeklyData.weekly_total || weeklyData.weekly_total <= 0) {
      toast.error(language === 'he' ? 'אנא חשב תחזית שבועית תחילה' : 'Please calculate weekly prediction first');
      return;
    }

    try {
      const weekNumber = moment(currentWeekStart).isoWeek();
      const year = moment(currentWeekStart).isoWeekYear();
      
      const user = await base44.auth.me();
      
      // Check if schedule exists
      const schedules = await base44.entities.WeeklySchedule.filter({
        week_number: String(weekNumber),
        year: String(year),
        created_by: user.email
      });

      if (schedules && schedules.length > 0) {
        // Update existing schedule
        await base44.entities.WeeklySchedule.update(schedules[0].id, {
          predicted_weekly_sales: weeklyData.weekly_total
        });
        toast.success(language === 'he' ? 'תחזית הועתקה ללוח המשמרות!' : 'Prediction copied to schedule!');
      } else {
        toast.info(language === 'he' ? 'לא נמצא לוח משמרות לשבוע זה' : 'No schedule found for this week');
      }
    } catch (error) {
      console.error("Error copying to schedule:", error);
      toast.error(t('error_saving'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            {language === 'he' ? 'מחשבון תחזית מכירות' : 'Sales Prediction Calculator'}
          </h1>
          <p className="text-gray-600 mt-2">
            {language === 'he' 
              ? 'חשב תחזיות מכירות יומיות, שבועיות וחודשיות על בסיס ממוצעים'
              : 'Calculate daily, weekly, and monthly sales predictions based on averages'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Prediction */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <Users className="w-5 h-5 text-blue-600" />
                {language === 'he' ? 'תחזית יומית' : 'Daily Prediction'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="avg_per_guest" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'ממוצע למבקר/עסקה' : 'Average per Guest/Deal'} (₪)
                </Label>
                <Input
                  id="avg_per_guest"
                  type="number"
                  inputMode="decimal"
                  value={dailyData.average_per_guest}
                  onChange={(e) => setDailyData({ ...dailyData, average_per_guest: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className={isRTL ? 'text-right' : 'text-left'}
                  dir="ltr"
                  min="0"
                  step="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_guests" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'מספר מבקרים ביום' : 'Total Guests per Day'}
                </Label>
                <Input
                  id="total_guests"
                  type="number"
                  inputMode="numeric"
                  value={dailyData.total_guests}
                  onChange={(e) => setDailyData({ ...dailyData, total_guests: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className={isRTL ? 'text-right' : 'text-left'}
                  dir="ltr"
                  min="0"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                <p className={`text-sm text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'סה"כ מכירות יומיות:' : 'Total Daily Sales:'}
                </p>
                <p className="text-3xl font-bold text-blue-700">
                  {formatCurrency(dailyData.daily_total)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dailyData.average_per_guest} × {dailyData.total_guests} = {dailyData.daily_total.toFixed(0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Prediction */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                <Calendar className="w-5 h-5 text-purple-600" />
                {language === 'he' ? 'תחזית שבועית' : 'Weekly Prediction'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="days_per_week" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'ימי פעילות בשבוע' : 'Operating Days per Week'}
                </Label>
                <Input
                  id="days_per_week"
                  type="number"
                  inputMode="numeric"
                  value={weeklyData.operating_days_per_week}
                  onChange={(e) => setWeeklyData({ ...weeklyData, operating_days_per_week: parseInt(e.target.value) || 0 })}
                  placeholder="7"
                  className={isRTL ? 'text-right' : 'text-left'}
                  dir="ltr"
                  min="1"
                  max="7"
                />
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                <p className={`text-sm text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'סה"כ מכירות שבועיות:' : 'Total Weekly Sales:'}
                </p>
                <p className="text-3xl font-bold text-purple-700">
                  {formatCurrency(weeklyData.weekly_total)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dailyData.daily_total.toFixed(0)} × {weeklyData.operating_days_per_week} {language === 'he' ? 'ימים' : 'days'}
                </p>
              </div>

              <Button
                onClick={handleCopyToSchedule}
                disabled={!weeklyData.weekly_total}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Copy className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'he' ? 'העתק ללוח משמרות' : 'Copy to Schedule'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Prediction */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <DollarSign className="w-5 h-5 text-green-600" />
              {language === 'he' ? 'תחזית חודשית' : 'Monthly Prediction'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="days_per_month" className={isRTL ? 'text-right block' : 'text-left block'}>
                  {language === 'he' ? 'ימי פעילות בחודש' : 'Operating Days per Month'}
                </Label>
                <Input
                  id="days_per_month"
                  type="number"
                  inputMode="numeric"
                  value={monthlyData.operating_days_per_month}
                  onChange={(e) => setMonthlyData({ ...monthlyData, operating_days_per_month: parseInt(e.target.value) || 0 })}
                  placeholder="30"
                  className={isRTL ? 'text-right' : 'text-left'}
                  dir="ltr"
                  min="1"
                  max="31"
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                <p className={`text-sm text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'he' ? 'סה"כ מכירות חודשיות:' : 'Total Monthly Sales:'}
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {formatCurrency(monthlyData.monthly_total)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dailyData.daily_total.toFixed(0)} × {monthlyData.operating_days_per_month} {language === 'he' ? 'ימים' : 'days'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        {dailyData.daily_total > 0 && (
          <Card className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300">
            <CardHeader>
              <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
                {language === 'he' ? 'סיכום תחזיות' : 'Predictions Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-2">
                    {language === 'he' ? 'יומי' : 'Daily'}
                  </p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(dailyData.daily_total)}
                  </p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-2">
                    {language === 'he' ? 'שבועי' : 'Weekly'}
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(weeklyData.weekly_total)}
                  </p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow">
                  <p className="text-sm text-gray-600 mb-2">
                    {language === 'he' ? 'חודשי' : 'Monthly'}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(monthlyData.monthly_total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}